import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../src/theme";
import { dateKey, getAllLogs, type DayLog } from "../../src/storage";

interface DayBar {
  date: string;
  label: string;
  totalMl: number;
  goalMl: number;
  hit: boolean;
}

export default function History() {
  const [days, setDays] = useState<DayBar[]>([]);
  const [stats, setStats] = useState({ avg: 0, daysHit: 0, totalDays: 0, totalMl: 0 });

  const load = useCallback(async () => {
    const all = await getAllLogs();
    const arr: DayBar[] = [];
    const wkDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const log: DayLog | undefined = all[key];
      arr.push({
        date: key,
        label: wkDays[d.getDay()],
        totalMl: log?.totalMl ?? 0,
        goalMl: log?.goalMl ?? 0,
        hit: log ? log.totalMl >= log.goalMl && log.goalMl > 0 : false,
      });
    }
    setDays(arr);

    const allLogs = Object.values(all);
    const totalMl = allLogs.reduce((s, l) => s + l.totalMl, 0);
    const daysHit = allLogs.filter((l) => l.goalMl > 0 && l.totalMl >= l.goalMl).length;
    setStats({
      avg: allLogs.length > 0 ? Math.round(totalMl / allLogs.length) : 0,
      daysHit,
      totalDays: allLogs.length,
      totalMl,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const maxBar = Math.max(
    ...days.map((d) => Math.max(d.totalMl, d.goalMl)),
    1000
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="history-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Seu Histórico</Text>
        <Text style={styles.subtitle}>Acompanhe sua jornada de hidratação</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#E0F4FA" }]}>
              <Ionicons name="trending-up" size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.statValue}>{(stats.avg / 1000).toFixed(1)}L</Text>
            <Text style={styles.statLabel}>Média diária</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FFF4E6" }]}>
              <Ionicons name="checkmark-done" size={18} color={theme.colors.accent} />
            </View>
            <Text style={styles.statValue}>{stats.daysHit}</Text>
            <Text style={styles.statLabel}>Dias na meta</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#E6F7F1" }]}>
              <Ionicons name="beaker" size={18} color={theme.colors.success} />
            </View>
            <Text style={styles.statValue}>{(stats.totalMl / 1000).toFixed(1)}L</Text>
            <Text style={styles.statLabel}>Total acumulado</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Últimos 7 dias</Text>
          <View style={styles.chart}>
            {days.map((d) => {
              const heightPct = Math.min(1, d.totalMl / maxBar);
              const goalPct = d.goalMl > 0 ? Math.min(1, d.goalMl / maxBar) : 0;
              return (
                <View key={d.date} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    {goalPct > 0 && (
                      <View
                        style={[
                          styles.goalLine,
                          { bottom: `${goalPct * 100}%` },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${heightPct * 100}%`,
                          backgroundColor: d.hit
                            ? theme.colors.success
                            : theme.colors.wave,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{d.label}</Text>
                  <Text style={styles.barValue}>
                    {d.totalMl > 0 ? `${(d.totalMl / 1000).toFixed(1)}L` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.wave }]} />
              <Text style={styles.legendText}>Consumo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>Meta atingida</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDash]} />
              <Text style={styles.legendText}>Meta</Text>
            </View>
          </View>
        </View>

        {stats.totalDays === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.textDisabled} />
            <Text style={styles.emptyText}>
              Registre suas primeiras doses para ver seu histórico aqui.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 24 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius.lg,
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "700" },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
  },
  chartTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary, marginBottom: 16 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 180,
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center" },
  barTrack: {
    width: "100%",
    height: 140,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
    position: "relative",
  },
  bar: { width: "100%", borderRadius: 8 },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    borderTopWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: "dashed",
    zIndex: 1,
  },
  barLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6, fontWeight: "700" },
  barValue: { fontSize: 10, color: theme.colors.textPrimary, fontWeight: "600" },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 16, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDash: { width: 16, height: 2, backgroundColor: theme.colors.accent },
  legendText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 32,
    borderRadius: theme.radius.xl,
    marginTop: 16,
    gap: 10,
  },
  emptyText: { color: theme.colors.textSecondary, textAlign: "center", fontSize: 14, fontWeight: "600" },
});
