import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../stores/auth";
import { theme } from "../theme";

export default function Index() {
  const hydrated = useAuth((state) => state.hydrated);
  const token = useAuth((state) => state.token);
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  return <Redirect href={token ? "/(tabs)" : "/(auth)/login"} />;
}
