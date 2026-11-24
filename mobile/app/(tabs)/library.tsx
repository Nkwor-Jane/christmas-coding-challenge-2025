import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { API_URL, api } from "../../services/api";
import { useAuth } from "../../stores/auth";
import { theme } from "../../theme";

type DocumentSummary = {
  id: string;
  title: string;
  author: string | null;
  total_pages: number;
  processing_status: string;
};

async function uploadPdf(file: Blob & { name: string }) {
  const token = useAuth.getState().token;
  const body = new FormData();
  body.append("file", file);
  body.append("title", file.name.replace(/\.pdf$/i, ""));
  const response = await fetch(`${API_URL}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(payload.detail || "Upload failed");
  }
  return response.json();
}

export default function LibraryScreen() {
  const token = useAuth((state) => state.token);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const documents = useQuery({
    queryKey: ["documents", token],
    enabled: Boolean(token),
    queryFn: () => api<DocumentSummary[]>("/documents"),
  });
  const upload = useMutation({
    mutationFn: uploadPdf,
    onSuccess: (document: DocumentSummary) => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/document/${document.id}`);
    },
    onError: (error: Error) => setMessage(error.message),
  });

  function chooseFile() {
    if (Platform.OS !== "web") {
      setMessage("Import from the web build in this environment, or add a development build for the native picker.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) upload.mutate(file);
    };
    input.click();
  }

  const visible = (documents.data ?? []).filter((item) => {
    const haystack = `${item.title} ${item.author ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Library</Text>
      <TextInput
        placeholder="Search titles"
        placeholderTextColor={theme.muted}
        style={styles.search}
        value={query}
        onChangeText={setQuery}
      />
      <Pressable style={styles.button} onPress={chooseFile} disabled={upload.isPending}>
        <Text style={styles.buttonText}>{upload.isPending ? "Importing…" : "Import PDF"}</Text>
      </Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      {visible.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/document/${item.id}`)}>
          <Text style={styles.book}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.author || "Unknown author"} · {item.total_pages} pages · {item.processing_status}
          </Text>
        </Pressable>
      ))}
      {documents.data && visible.length === 0 ? <Text style={styles.meta}>No documents match that search.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  title: { fontFamily: "Georgia", fontSize: 36, color: theme.ink, marginBottom: 14 },
  search: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
    marginBottom: 12,
  },
  button: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  buttonText: { color: theme.accentInk, fontWeight: "600" },
  card: { backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.line },
  book: { fontFamily: "Georgia", fontSize: 20, color: theme.ink },
  meta: { color: theme.muted, marginTop: 4 },
  error: { color: theme.accent, marginBottom: 10 },
});
