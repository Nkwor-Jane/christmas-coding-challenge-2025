import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../services/api";
import { useAuth } from "../../stores/auth";
import { theme } from "../../theme";

type ProgressRow = {
  document_id: string;
  mode: string;
  current_page: number;
  progress_percentage: number;
  last_opened_at: string;
};

type Pull = {
  documents: { id: string; title: string; author: string | null; total_pages: number }[];
  progress: ProgressRow[];
};

type Overview = {
  reading: { total_seconds: number; books_completed: number };
  listening: { total_seconds: number };
  streak_days: number;
};

function minutes(seconds: number) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

export default function HomeScreen() {
  const user = useAuth((state) => state.user);
  const token = useAuth((state) => state.token);
  const library = useQuery({
    queryKey: ["home", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const [pull, overview] = await Promise.all([
        api<Pull>("/sync/pull", { method: "POST", body: JSON.stringify({ since: null }) }),
        api<Overview>("/analytics/overview"),
      ]);
      return { pull, overview };
    },
  });

  const progress = library.data?.pull.progress ?? [];
  const documents = library.data?.pull.documents ?? [];
  const latest = [...progress].sort((a, b) => (a.last_opened_at < b.last_opened_at ? 1 : -1))[0];
  const current = documents.find((item) => item.id === latest?.document_id);
  useFocusEffect(
    useCallback(() => {
      library.refetch();
    }, [library.refetch]),
  );
  const greeting = user?.full_name?.split(" ")[0] || "there";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Today</Text>
      <Text style={styles.title}>Hello, {greeting}.</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{library.data?.overview.streak_days ?? 0}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {library.data ? minutes(library.data.overview.reading.total_seconds + library.data.overview.listening.total_seconds) : 0}
          </Text>
          <Text style={styles.statLabel}>active minutes</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Continue</Text>
        {current ? (
          <>
            <Text style={styles.cardTitle}>{current.title}</Text>
            <Text style={styles.cardMeta}>
              {latest?.mode === "listening" ? "Listening" : "Reading"} · page {latest?.current_page} of {current.total_pages}
            </Text>
            <Pressable style={styles.button} onPress={() => router.push(`/document/${current.id}`)}>
              <Text style={styles.buttonText}>Resume</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Nothing open yet</Text>
            <Text style={styles.cardMeta}>Import a PDF and it will wait here.</Text>
            <Pressable style={styles.button} onPress={() => router.push("/(tabs)/library")}>
              <Text style={styles.buttonText}>Open library</Text>
            </Pressable>
          </>
        )}
      </View>
      <Text style={styles.section}>Recently added</Text>
      {documents.slice(0, 3).map((item) => (
        <Pressable key={item.id} style={styles.listItem} onPress={() => router.push(`/document/${item.id}`)}>
          <Text style={styles.book}>{item.title}</Text>
          <Text style={styles.meta}>{item.author || "Unknown author"} · {item.total_pages} pages</Text>
        </Pressable>
      ))}
      {library.isError ? <Text style={styles.error}>Could not reach the reading API.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  kicker: { color: theme.accent, letterSpacing: 1.1, textTransform: "uppercase", fontSize: 12 },
  title: { fontFamily: "Georgia", fontSize: 36, color: theme.ink, marginTop: 6, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.line },
  statValue: { fontFamily: "Georgia", fontSize: 28, color: theme.ink },
  statLabel: { color: theme.muted, marginTop: 4 },
  card: { backgroundColor: theme.ink, borderRadius: 18, padding: 18, marginTop: 16 },
  cardLabel: { color: "#e7c7bc", textTransform: "uppercase", letterSpacing: 1, fontSize: 12 },
  cardTitle: { color: "#fffdf8", fontSize: 26, fontFamily: "Georgia", marginTop: 8 },
  cardMeta: { color: "#d9d0c4", marginTop: 6 },
  book: { color: theme.ink, fontSize: 18, fontFamily: "Georgia", marginTop: 4 },
  meta: { color: theme.muted, marginTop: 4 },
  button: { alignSelf: "flex-start", backgroundColor: theme.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },
  buttonText: { color: theme.accentInk, fontWeight: "600" },
  section: { marginTop: 26, marginBottom: 8, color: theme.ink, fontSize: 18, fontFamily: "Georgia" },
  listItem: { backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.line },
  error: { color: theme.accent, marginTop: 12 },
});
