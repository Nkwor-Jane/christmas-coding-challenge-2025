import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../stores/auth";
import { theme } from "../../theme";

export default function ProfileScreen() {
  const user = useAuth((state) => state.user);
  const clear = useAuth((state) => state.clear);

  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>Account</Text>
      <Text style={styles.title}>{user?.full_name || "Reader"}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Narration</Text>
        <Text style={styles.meta}>
          This build speaks with the device voice and queues the rest of the document automatically. A cloud voice can be added later without changing the player.
        </Text>
      </View>
      <Pressable
        style={styles.button}
        onPress={() => {
          clear();
          router.replace("/(auth)/login");
        }}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 48 },
  kicker: { color: theme.accent, letterSpacing: 1.1, textTransform: "uppercase", fontSize: 12 },
  title: { fontFamily: "Georgia", fontSize: 36, color: theme.ink, marginTop: 8 },
  meta: { color: theme.muted, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.line, marginTop: 20 },
  cardTitle: { fontFamily: "Georgia", fontSize: 20, color: theme.ink },
  button: { marginTop: 24, borderColor: theme.ink, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: theme.ink, fontWeight: "600" },
});
