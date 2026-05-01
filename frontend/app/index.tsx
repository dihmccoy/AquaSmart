import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getProfile } from "../src/storage";
import { theme } from "../src/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/onboarding");
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
