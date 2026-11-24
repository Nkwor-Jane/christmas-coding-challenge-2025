import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { api } from "../../services/api";
import { useAuth, type Reader } from "../../stores/auth";
import { theme } from "../../theme";

export default function LoginScreen() {
  const setSession = useAuth((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ access_token: string; user: Reader }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(result.access_token, result.user);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>Reading Companion</Text>
      <Text style={styles.title}>Pick up where you left off.</Text>
      <Text style={styles.copy}>Your library, narration, and reading record stay tied to this account.</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={theme.muted}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={theme.muted}
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
      <Link href="/(auth)/register" style={styles.link}>
        Create an account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg, padding: 28, justifyContent: "center" },
  kicker: { color: theme.accent, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: theme.ink, fontSize: 36, lineHeight: 42, fontFamily: "Georgia", marginTop: 10 },
  copy: { color: theme.muted, fontSize: 16, lineHeight: 22, marginTop: 10, marginBottom: 22 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: theme.ink,
  },
  button: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: theme.accentInk, fontSize: 16, fontWeight: "600" },
  link: { color: theme.ink, marginTop: 18, fontSize: 15 },
  error: { color: theme.accent, marginBottom: 8 },
});
