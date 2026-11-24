import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { offline } from "../../database/offline";
import { api } from "../../services/api";
import { createNarrationEngine, type NarrationEngine, type NarrationSegment } from "../../services/narration";
import { queueProgress } from "../../services/sync";
import { useAuth } from "../../stores/auth";
import { theme } from "../../theme";

type Page = { page_number: number; extracted_text: string; extraction_method: string };
type Progress = {
  mode: string;
  current_page: number;
  position_offset: number;
  progress_percentage: number;
} | null;
type DocumentDetail = {
  id: string;
  title: string;
  author: string | null;
  total_pages: number;
  total_words: number;
  processing_status: string;
  reading_progress: Progress;
  listening_progress: Progress;
  estimates: {
    reading_percent: number;
    listening_percent: number;
    reading_minutes_left: number;
    listening_minutes_left: number;
  };
  time_spent: { reading_seconds: number; listening_seconds: number };
  pages: Page[];
};

const PROMPTS = [
  "Summarise this document.",
  "What are the key arguments?",
  "Explain this in simpler words.",
];

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();
  const documentQuery = useQuery({
    queryKey: ["document", id, token],
    enabled: Boolean(token && id),
    queryFn: () => api<DocumentDetail>(`/documents/${id}`),
  });
  const [mode, setMode] = useState<"read" | "listen" | "ask">("read");
  const [page, setPage] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [segmentLabel, setSegmentLabel] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [cited, setCited] = useState<number[]>([]);
  const engine = useRef<NarrationEngine | null>(null);
  const stopRef = useRef(false);
  const sessionRef = useRef<string | null>(null);
  const sessionStarted = useRef<number>(Date.now());

  useEffect(() => {
    const detail = documentQuery.data;
    if (!detail) return;
    setPage(detail.reading_progress?.current_page || 1);
    offline.saveDocument({
      id: detail.id,
      title: detail.title,
      author: detail.author,
      total_pages: detail.total_pages,
      pages: detail.pages.map((item) => ({
        page_number: item.page_number,
        extracted_text: item.extracted_text,
      })),
      savedAt: new Date().toISOString(),
    });
  }, [documentQuery.data]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<{ id: string }>("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ document_id: id, mode: "reading", device_id: "web" }),
    }).then((session) => {
      if (!cancelled) {
        sessionRef.current = session.id;
        sessionStarted.current = Date.now();
      }
    }).catch(() => undefined);
    const beat = setInterval(() => {
      if (sessionRef.current) {
        api(`/sessions/${sessionRef.current}/heartbeat`, { method: "POST" }).catch(() => undefined);
      }
    }, 15000);
    return () => {
      cancelled = true;
      stopRef.current = true;
      engine.current?.stop();
      const sessionId = sessionRef.current;
      if (sessionId) {
        const seconds = Math.round((Date.now() - sessionStarted.current) / 1000);
        api(`/sessions/${sessionId}/end`, {
          method: "POST",
          body: JSON.stringify({ duration_seconds: seconds, pages_completed: 1 }),
        }).catch(() => undefined);
      }
      clearInterval(beat);
    };
  }, [id]);

  async function saveReading(nextPage: number) {
    if (!id) return;
    await queueProgress({
      document_id: id,
      mode: "reading",
      current_page: nextPage,
      position_offset: 0,
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["document", id] });
  }

  async function listen() {
    if (!id || playing) return;
    setMode("listen");
    setPlaying(true);
    stopRef.current = false;
    const narration = await api<{ segments: NarrationSegment[] }>(`/documents/${id}/narration?start_page=${page}`);
    engine.current = createNarrationEngine();
    let spoken = 0;
    for (const segment of narration.segments) {
      if (stopRef.current) break;
      setPage(segment.page_number);
      setSegmentLabel(segment.text);
      await engine.current.speak(segment.text, { voiceId: "device-default", speed });
      spoken += segment.text.length;
      await queueProgress({
        document_id: id,
        mode: "listening",
        current_page: segment.page_number,
        position_offset: spoken,
        updated_at: new Date().toISOString(),
      });
    }
    setPlaying(false);
    queryClient.invalidateQueries({ queryKey: ["document", id] });
  }

  function stopListening() {
    stopRef.current = true;
    engine.current?.stop();
    setPlaying(false);
  }

  const ask = useMutation({
    mutationFn: async (message: string) =>
      api<{ response: string; cited_pages: number[] }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ document_id: id, message }),
      }),
    onSuccess: (result) => {
      setAnswer(result.response);
      setCited(result.cited_pages);
    },
  });

  const detail = documentQuery.data;
  const current = detail?.pages.find((item) => item.page_number === page) ?? detail?.pages[0];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back to library</Text>
      </Pressable>
      {documentQuery.isLoading ? <Text style={styles.meta}>Opening the document…</Text> : null}
      {documentQuery.isError ? <Text style={styles.error}>This document could not be opened.</Text> : null}
      {detail && current ? (
        <>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.meta}>
            {detail.author || "Unknown author"} · {detail.total_pages} pages · {detail.total_words} words
          </Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>Read {detail.estimates.reading_percent}%</Text>
            <Text style={styles.metric}>Heard {detail.estimates.listening_percent}%</Text>
            <Text style={styles.metric}>{detail.estimates.reading_minutes_left} min left to read</Text>
          </View>
          <View style={styles.modes}>
            {(["read", "listen", "ask"] as const).map((item) => (
              <Pressable key={item} style={[styles.mode, mode === item && styles.modeOn]} onPress={() => setMode(item)}>
                <Text style={[styles.modeText, mode === item && styles.modeTextOn]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          {mode === "read" ? (
            <View style={styles.paper}>
              <Text style={styles.pageLabel}>Page {current.page_number}</Text>
              <Text style={styles.body}>
                {current.extracted_text || "This page has no extractable text. It may be a scan."}
              </Text>
              <View style={styles.nav}>
                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    saveReading(next);
                  }}
                >
                  <Text>Previous</Text>
                </Pressable>
                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    const next = Math.min(detail.total_pages, page + 1);
                    setPage(next);
                    saveReading(next);
                  }}
                >
                  <Text>Next</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {mode === "listen" ? (
            <View style={styles.paper}>
              <Text style={styles.pageLabel}>{playing ? "Now reading" : "Ready"} · {speed.toFixed(2)}x</Text>
              <Text style={styles.body}>{segmentLabel || current.extracted_text || "Nothing to read aloud."}</Text>
              <View style={styles.nav}>
                <Pressable style={styles.primary} onPress={playing ? stopListening : listen}>
                  <Text style={styles.primaryText}>{playing ? "Stop" : "Play from this page"}</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setSpeed((value) => (value >= 1.5 ? 0.75 : value + 0.25))}>
                  <Text>Speed</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {mode === "ask" ? (
            <View style={styles.paper}>
              <View style={styles.prompts}>
                {PROMPTS.map((prompt) => (
                  <Pressable key={prompt} style={styles.prompt} onPress={() => ask.mutate(prompt)}>
                    <Text>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ask about this document"
                placeholderTextColor={theme.muted}
                value={question}
                onChangeText={setQuestion}
              />
              <Pressable
                style={styles.primary}
                onPress={() => question.trim() && ask.mutate(question.trim())}
                disabled={ask.isPending}
              >
                <Text style={styles.primaryText}>{ask.isPending ? "Looking…" : "Ask"}</Text>
              </Pressable>
              {answer ? (
                <Text style={styles.body}>
                  {answer}
                  {cited.length ? `\n\nCited pages: ${cited.join(", ")}` : ""}
                </Text>
              ) : null}
              {ask.isError ? <Text style={styles.error}>The assistant could not answer just now.</Text> : null}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 36, paddingBottom: 48 },
  back: { color: theme.accent, marginBottom: 12 },
  title: { fontFamily: "Georgia", fontSize: 32, color: theme.ink },
  meta: { color: theme.muted, marginTop: 6 },
  error: { color: theme.accent, marginTop: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metric: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, color: theme.ink },
  modes: { flexDirection: "row", gap: 8, marginTop: 16 },
  mode: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card },
  modeOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  modeText: { color: theme.ink, textTransform: "capitalize" },
  modeTextOn: { color: "#fffdf8" },
  paper: { backgroundColor: theme.card, borderRadius: 18, padding: 18, marginTop: 16, borderWidth: 1, borderColor: theme.line },
  pageLabel: { color: theme.accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12 },
  body: { color: theme.ink, fontSize: 18, lineHeight: 28, marginTop: 12, fontFamily: "Georgia" },
  nav: { flexDirection: "row", gap: 10, marginTop: 16 },
  primary: { backgroundColor: theme.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start", marginTop: 12 },
  primaryText: { color: theme.accentInk, fontWeight: "600" },
  secondary: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  prompts: { gap: 8 },
  prompt: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 10 },
  input: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 12, marginTop: 12, color: theme.ink },
});
