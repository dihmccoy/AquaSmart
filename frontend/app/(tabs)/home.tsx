import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { theme } from "../../src/theme";
import {
  addIntake,
  getOrCreateTodayLog,
  getProfile,
  removeIntake,
  type DayLog,
  type UserProfile,
} from "../../src/storage";
import { isWithinSleepHours } from "../../src/calc";

const QUICK_ADDS = [200, 300, 500];

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [log, setLog] = useState<DayLog | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [now, setNow] = useState(new Date());

  const refresh = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
    const l = await getOrCreateTodayLog(p.dailyGoalMl);
    setLog(l);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sleeping = useMemo(() => {
    if (!profile) return false;
    const minutes = now.getHours() * 60 + now.getMinutes();
    return isWithinSleepHours(
      minutes,
      profile.sleepHour,
      profile.sleepMinute,
      profile.wakeHour,
      profile.wakeMinute
    );
  }, [profile, now]);

  const progress = log && log.goalMl > 0 ? Math.min(1, log.totalMl / log.goalMl) : 0;
  const remaining = log ? Math.max(0, (log.goalMl ?? 0) - (log.totalMl ?? 0)) : 0;
  const percent = Math.round(progress * 100);

  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const fillHeight = useSharedValue(0);

  useEffect(() => {
    wave1.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.linear }), -1, false);
    wave2.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.linear }), -1, false);
  }, [wave1, wave2]);

  useEffect(() => {
    fillHeight.value = withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [progress, fillHeight]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value * 100}%`,
  }));
  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + wave1.value * 160 }],
  }));
  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + wave2.value * 160 }],
  }));

  const handleAdd = async (amount: number) => {
    if (!profile) return;
    const updated = await addIntake(amount, profile.dailyGoalMl);
    setLog(updated);
  };

  const handleCustomAdd = async () => {
    const v = parseInt(customMl, 10);
    if (isNaN(v) || v <= 0 || v > 5000) {
      Alert.alert("Valor inválido", "Informe um valor entre 1 e 5000 ml.");
      return;
    }
    await handleAdd(v);
    setCustomMl("");
    setShowCustom(false);
  };

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, [now]);

  const dateStr = useMemo(() => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  }, [now]);

  if (!profile || !log) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{profile.name || "Você"} 👋</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color={theme.colors.accent} />
            <Text style={styles.streakText}>{percent}%</Text>
          </View>
        </View>

        {sleeping && (
          <View style={styles.sleepBanner} testID="sleep-banner">
            <Ionicons name="moon" size={18} color={theme.colors.primary} />
            <Text style={styles.sleepBannerText}>
              Modo descanso ativo. Sem notificações até as{" "}
              {String(profile.wakeHour).padStart(2, "0")}:
              {String(profile.wakeMinute).padStart(2, "0")}.
            </Text>
          </View>
        )}

        {/* Hero progress bottle */}
        <View style={styles.heroWrap}>
          <View style={styles.bottle}>
            <Animated.View style={[styles.fillContainer, fillStyle]}>
              <View style={styles.fill}>
                <Animated.View style={[styles.wave, wave1Style]}>
                  <View style={[styles.waveBlob, { backgroundColor: "#48CAE4" }]} />
                  <View style={[styles.waveBlob, { backgroundColor: "#48CAE4", left: 80 }]} />
                </Animated.View>
                <Animated.View style={[styles.wave, { top: 6, opacity: 0.6 }, wave2Style]}>
                  <View style={[styles.waveBlob, { backgroundColor: "#90E0EF" }]} />
                  <View style={[styles.waveBlob, { backgroundColor: "#90E0EF", left: 80 }]} />
                </Animated.View>
              </View>
            </Animated.View>
            <View style={styles.bottleOverlay} pointerEvents="none">
              <Text style={styles.bottlePercent} testID="progress-percent">
                {percent}%
              </Text>
              <Text style={styles.bottleAmount} testID="progress-amount">
                {log.totalMl}
                <Text style={styles.bottleAmountUnit}> / {log.goalMl}ml</Text>
              </Text>
              {remaining > 0 ? (
                <Text style={styles.bottleRemaining}>Faltam {remaining}ml</Text>
              ) : (
                <Text style={[styles.bottleRemaining, { color: theme.colors.success }]}>
                  Meta alcançada! 🎉
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Quick add */}
        <Text style={styles.sectionLabel}>Adicionar rápido</Text>
        <View style={styles.quickGrid}>
          {QUICK_ADDS.map((amt) => (
            <Pressable
              key={amt}
              onPress={() => handleAdd(amt)}
              style={({ pressed }) => [
                styles.quickBtn,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              testID={`quick-add-${amt}ml`}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name="water" size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.quickAmount}>{amt}ml</Text>
              <Text style={styles.quickLabel}>
                {amt === 200 ? "Copo" : amt === 300 ? "Caneca" : "Garrafa"}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowCustom(true)}
            style={({ pressed }) => [
              styles.quickBtn,
              styles.quickBtnAccent,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            testID="quick-add-custom"
          >
            <View style={[styles.quickIconWrap, { backgroundColor: "#fff" }]}>
              <Ionicons name="add" size={22} color={theme.colors.accent} />
            </View>
            <Text style={[styles.quickAmount, { color: "#fff" }]}>Outro</Text>
            <Text style={[styles.quickLabel, { color: "#FFE0B0" }]}>Personalizado</Text>
          </Pressable>
        </View>

        {/* Today's entries */}
        <Text style={styles.sectionLabel}>Hoje</Text>
        <View style={styles.entriesCard}>
          {log.entries.length === 0 ? (
            <View style={styles.emptyEntries}>
              <Ionicons name="water-outline" size={32} color={theme.colors.textDisabled} />
              <Text style={styles.emptyEntriesText}>
                Comece registrando seu primeiro gole do dia
              </Text>
            </View>
          ) : (
            [...log.entries].reverse().map((entry) => {
              const t = new Date(entry.timestamp);
              const time = `${String(t.getHours()).padStart(2, "0")}:${String(
                t.getMinutes()
              ).padStart(2, "0")}`;
              return (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryDot}>
                    <Ionicons name="water" size={16} color={theme.colors.wave} />
                  </View>
                  <Text style={styles.entryAmount}>{entry.amountMl}ml</Text>
                  <Text style={styles.entryTime}>{time}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const updated = await removeIntake(entry.id);
                      if (updated) setLog(updated);
                    }}
                    hitSlop={10}
                    testID={`delete-${entry.id}`}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.colors.textDisabled} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Custom modal */}
      <Modal
        visible={showCustom}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustom(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quantidade personalizada</Text>
            <Text style={styles.modalSub}>Quanto você bebeu agora?</Text>
            <TextInput
              style={styles.modalInput}
              value={customMl}
              onChangeText={setCustomMl}
              keyboardType="numeric"
              placeholder="ml"
              placeholderTextColor={theme.colors.textDisabled}
              autoFocus
              testID="input-custom-ml"
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCustom(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleCustomAdd}
                testID="confirm-custom-ml"
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  greeting: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: "600" },
  userName: { fontSize: 28, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.7 },
  date: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  streakText: { color: theme.colors.accent, fontWeight: "800", fontSize: 13 },
  sleepBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 16,
  },
  sleepBannerText: { flex: 1, color: theme.colors.primary, fontSize: 13, fontWeight: "600" },
  heroWrap: { alignItems: "center", marginVertical: 16 },
  bottle: {
    width: 220,
    height: 280,
    borderRadius: 110,
    backgroundColor: "#E0F4FA",
    borderWidth: 6,
    borderColor: "#fff",
    overflow: "hidden",
    shadowColor: "#0077B6",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  fillContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.colors.wave,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    top: -8,
    left: 0,
    width: 320,
    height: 24,
    flexDirection: "row",
  },
  waveBlob: {
    position: "absolute",
    width: 80,
    height: 24,
    borderRadius: 40,
  },
  bottleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bottlePercent: {
    fontSize: 56,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -2,
  },
  bottleAmount: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary, marginTop: -4 },
  bottleAmountUnit: { fontWeight: "600", color: theme.colors.textSecondary },
  bottleRemaining: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, fontWeight: "600" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 12,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: "flex-start",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  quickBtnAccent: { backgroundColor: theme.colors.accent },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F4FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickAmount: { fontSize: 22, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.5 },
  quickLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" },
  entriesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 8,
  },
  emptyEntries: { alignItems: "center", padding: 24, gap: 10 },
  emptyEntriesText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  entryDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F4FA",
    alignItems: "center",
    justifyContent: "center",
  },
  entryAmount: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  entryTime: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: "600", marginRight: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,48,71,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.5 },
  modalSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 16 },
  modalInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  modalCancel: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
  },
  modalCancelText: { color: theme.colors.textPrimary, fontWeight: "700" },
  modalConfirm: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});
