import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../services/api";
import { useAuth } from "../../stores/auth";
import { theme } from "../../theme";

type Overview = {
  reading: { total_seconds: number; total_pages: number; sessions: number; books_completed: number };
  listening: { total_seconds: number; total_pages: number; sessions: number; books_completed: number };
  streak_days: number;
};

function hours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

export default function ProgressScreen() {
  const token = useAuth((state) => state.token);
  const overview = useQuery({
    queryKey: ["overview", token],
    enabled: Boolean(token),
    queryFn: () => api<Overview>("/analytics/overview"),
  });
  const data = overview.data;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.copy}>Reading and listening are counted apart, and only while a session is active.</Text>
      <Text style={styles.section}>Reading</Text>
      <View style={styles.card}>
        <Text style={styles.figure}>{data ? hours(data.reading.total_seconds) : "–"} h</Text>
        <Text style={styles.meta}>{data?.reading.total_pages ?? 0} pages · {data?.reading.sessions ?? 0} sessions · {data?.reading.books_completed ?? 0} finished</Text>
      </View>
      <Text style={styles.section}>Listening</Text>
      <View style={styles.card}>
        <Text style={styles.figure}>{data ? hours(data.listening.total_seconds) : "–"} h</Text>
        <Text style={styles.meta}>{data?.listening.sessions ?? 0} sessions · {data?.listening.books_completed ?? 0} finished</Text>
      </View>
      <Text style={styles.meta}>Current streak: {data?.streak_days ?? 0} days</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 48 },
  title: { fontFamily: "Georgia", fontSize: 36, color: theme.ink },
  copy: { color: theme.muted, marginTop: 8, marginBottom: 8, lineHeight: 20 },
  section: { fontFamily: "Georgia", fontSize: 22, color: theme.ink, marginTop: 18 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.line, marginTop: 8 },
  figure: { fontFamily: "Georgia", fontSize: 32, color: theme.ink },
  meta: { color: theme.muted, marginTop: 6 },
});
