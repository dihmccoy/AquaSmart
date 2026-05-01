import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../src/theme";
import { getAllLogs, todayKey } from "../../src/storage";
import { ACHIEVEMENTS, computeContext, type AchievementContext } from "../../src/achievements";

export default function Achievements() {
  const [ctx, setCtx] = useState<AchievementContext | null>(null);

  const load = useCallback(async () => {
    const all = await getAllLogs();
    const logs = Object.values(all);
    const c = computeContext(logs, todayKey());
    setCtx(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!ctx) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="achievements-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Conquistas</Text>
        <Text style={styles.subtitle}>Recompensas pela sua hidratação consistente</Text>

        {/* Streak hero */}
        <View style={styles.streakHero}>
          <View style={styles.streakIconWrap}>
            <Ionicons name="flame" size={40} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>OFENSIVA ATUAL</Text>
            <Text style={styles.streakValue}>
              {ctx.currentStreak} <Text style={styles.streakUnit}>dia{ctx.currentStreak === 1 ? "" : "s"}</Text>
            </Text>
            <Text style={styles.streakSub}>
              Recorde: {ctx.bestStreak} dia{ctx.bestStreak === 1 ? "" : "s"} 🏆
            </Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.qStat}>
            <Text style={styles.qStatValue}>{ctx.daysOnGoal}</Text>
            <Text style={styles.qStatLabel}>Metas batidas</Text>
          </View>
          <View style={styles.qDivider} />
          <View style={styles.qStat}>
            <Text style={styles.qStatValue}>{(ctx.totalLifetimeMl / 1000).toFixed(1)}L</Text>
            <Text style={styles.qStatLabel}>Total bebido</Text>
          </View>
          <View style={styles.qDivider} />
          <View style={styles.qStat}>
            <Text style={styles.qStatValue}>{ctx.totalDays}</Text>
            <Text style={styles.qStatLabel}>Dias ativos</Text>
          </View>
        </View>

        {/* Badges grid */}
        <Text style={styles.sectionLabel}>Medalhas</Text>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.check(ctx);
            return (
              <View
                key={a.id}
                style={[styles.badge, !unlocked && styles.badgeLocked]}
                testID={`badge-${a.id}`}
              >
                <View
                  style={[
                    styles.badgeIcon,
                    unlocked
                      ? { backgroundColor: theme.colors.primary }
                      : { backgroundColor: theme.colors.surfaceAlt },
                  ]}
                >
                  <Ionicons
                    name={a.icon as keyof typeof Ionicons.glyphMap}
                    size={28}
                    color={unlocked ? "#fff" : theme.colors.textDisabled}
                  />
                </View>
                <Text
                  style={[
                    styles.badgeTitle,
                    !unlocked && { color: theme.colors.textSecondary },
                  ]}
                >
                  {a.title}
                </Text>
                <Text style={styles.badgeDesc}>{a.description}</Text>
                {unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  streakHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.xl,
    padding: 20,
    shadowColor: "#FB8500",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  streakIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: {
    color: "#FFE0B0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  streakValue: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  streakUnit: { fontSize: 18, fontWeight: "600" },
  streakSub: { color: "#FFE0B0", fontSize: 13, fontWeight: "600" },
  quickStats: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginTop: 16,
    alignItems: "center",
  },
  qStat: { flex: 1, alignItems: "center" },
  qStatValue: { fontSize: 22, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.5 },
  qStatLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700", marginTop: 2 },
  qDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 12,
  },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: "flex-start",
    gap: 6,
    position: "relative",
  },
  badgeLocked: { opacity: 0.7 },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  badgeTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.3 },
  badgeDesc: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },
  unlockedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
});
