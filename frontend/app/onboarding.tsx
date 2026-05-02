import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../src/theme";
import { calculateDailyGoal, formatTime } from "../src/calc";
import { saveProfile, type ActivityLevel } from "../src/storage";
import { ensurePermissions, scheduleSmartReminders } from "../src/notifications";

const ACTIVITIES: { id: ActivityLevel; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "sedentary", label: "Sedentário", sub: "Pouco ou nenhum exercício", icon: "bed-outline" },
  { id: "moderate", label: "Moderado", sub: "Exercício 3-5x na semana", icon: "walk-outline" },
  { id: "active", label: "Ativo", sub: "Exercício intenso quase diário", icon: "barbell-outline" },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [wakeDate, setWakeDate] = useState(() => new Date(2024, 0, 1, 7, 0));
  const [sleepDate, setSleepDate] = useState(() => new Date(2024, 0, 1, 23, 0));
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const weightNum = parseFloat(weight.replace(",", "."));
  const ageNum = parseInt(age, 10);
  const goalMl =
    !isNaN(weightNum) && !isNaN(ageNum) && weightNum > 0
      ? calculateDailyGoal(weightNum, ageNum, activity)
      : 0;

  const canNext1 = name.trim().length > 0;
  const canNext2 =
    !isNaN(weightNum) && weightNum >= 20 && weightNum <= 300 &&
    !isNaN(ageNum) && ageNum >= 5 && ageNum <= 110;

  const handleFinish = async () => {
    const profile = {
      name: name.trim(),
      weight: weightNum,
      age: ageNum,
      activity,
      wakeHour: wakeDate.getHours(),
      wakeMinute: wakeDate.getMinutes(),
      sleepHour: sleepDate.getHours(),
      sleepMinute: sleepDate.getMinutes(),
      dailyGoalMl: goalMl,
      notificationsEnabled: true,
      cupSizeMl: 250,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveProfile(profile);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar seu perfil.");
      return;
    }
    // Notifications are optional - failures should not block onboarding
    try {
      const granted = await ensurePermissions();
      if (granted) {
        await scheduleSmartReminders(profile);
      }
    } catch (e) {
      console.warn("Notification setup failed:", e);
    }
    router.replace("/(tabs)/home");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.dropBubble}>
                <Ionicons name="water" size={28} color="#fff" />
              </View>
              <Text style={styles.brand}>AquaSmart</Text>
            </View>

            <View style={styles.progressBar}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= step && { backgroundColor: theme.colors.primary, width: 28 },
                  ]}
                />
              ))}
            </View>

            {step === 0 && (
              <View style={styles.card} testID="onboarding-step-name">
                <Text style={styles.title}>Bem-vindo!</Text>
                <Text style={styles.subtitle}>
                  Vamos personalizar sua hidratação. Como podemos te chamar?
                </Text>
                <Text style={styles.label}>Seu nome</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Lucas"
                  placeholderTextColor={theme.colors.textDisabled}
                  autoCapitalize="words"
                  testID="input-name"
                />
              </View>
            )}

            {step === 1 && (
              <View style={styles.card} testID="onboarding-step-body">
                <Text style={styles.title}>Sobre você</Text>
                <Text style={styles.subtitle}>
                  Usamos esses dados para calcular sua meta diária ideal.
                </Text>

                <Text style={styles.label}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Ex: 70"
                  placeholderTextColor={theme.colors.textDisabled}
                  keyboardType="numeric"
                  testID="input-weight"
                />

                <Text style={styles.label}>Idade</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Ex: 28"
                  placeholderTextColor={theme.colors.textDisabled}
                  keyboardType="numeric"
                  testID="input-age"
                />
              </View>
            )}

            {step === 2 && (
              <View style={styles.card} testID="onboarding-step-activity">
                <Text style={styles.title}>Nível de atividade</Text>
                <Text style={styles.subtitle}>
                  Quanto mais ativo, mais água você precisa.
                </Text>
                {ACTIVITIES.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.activityRow,
                      activity === a.id && styles.activityRowActive,
                    ]}
                    onPress={() => setActivity(a.id)}
                    testID={`activity-${a.id}`}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.activityIconWrap,
                        activity === a.id && { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={a.icon}
                        size={22}
                        color={activity === a.id ? "#fff" : theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityLabel}>{a.label}</Text>
                      <Text style={styles.activitySub}>{a.sub}</Text>
                    </View>
                    {activity === a.id && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 3 && (
              <View style={styles.card} testID="onboarding-step-sleep">
                <Text style={styles.title}>Seu descanso</Text>
                <Text style={styles.subtitle}>
                  Não vamos te incomodar enquanto você dorme. Defina seu horário.
                </Text>

                <Text style={styles.label}>Horário de acordar</Text>
                <TouchableOpacity
                  style={styles.timeRow}
                  onPress={() => setShowWakePicker(true)}
                  testID="select-wake-time"
                >
                  <Ionicons name="sunny-outline" size={22} color={theme.colors.accent} />
                  <Text style={styles.timeText}>
                    {formatTime(wakeDate.getHours(), wakeDate.getMinutes())}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <Text style={styles.label}>Horário de dormir</Text>
                <TouchableOpacity
                  style={styles.timeRow}
                  onPress={() => setShowSleepPicker(true)}
                  testID="select-sleep-time"
                >
                  <Ionicons name="moon-outline" size={22} color={theme.colors.primary} />
                  <Text style={styles.timeText}>
                    {formatTime(sleepDate.getHours(), sleepDate.getMinutes())}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {(showWakePicker || Platform.OS === "ios") && showWakePicker && (
                  <DateTimePicker
                    value={wakeDate}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, d) => {
                      setShowWakePicker(Platform.OS === "ios");
                      if (d) setWakeDate(d);
                    }}
                  />
                )}
                {(showSleepPicker || Platform.OS === "ios") && showSleepPicker && (
                  <DateTimePicker
                    value={sleepDate}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, d) => {
                      setShowSleepPicker(Platform.OS === "ios");
                      if (d) setSleepDate(d);
                    }}
                  />
                )}

                {goalMl > 0 && (
                  <View style={styles.goalPreview}>
                    <Text style={styles.goalPreviewLabel}>Sua meta diária</Text>
                    <Text style={styles.goalPreviewValue}>
                      {goalMl} <Text style={styles.goalUnit}>ml</Text>
                    </Text>
                    <Text style={styles.goalPreviewSub}>
                      ≈ {Math.round(goalMl / 250)} copos de 250ml
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.actions}>
              {step > 0 && (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(step - 1)}
                  testID="onboarding-back"
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                  <Text style={styles.backBtnText}>Voltar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.nextBtn,
                  ((step === 0 && !canNext1) || (step === 1 && !canNext2)) && styles.nextBtnDisabled,
                ]}
                disabled={(step === 0 && !canNext1) || (step === 1 && !canNext2)}
                onPress={() => {
                  if (step < 3) setStep(step + 1);
                  else handleFinish();
                }}
                testID="onboarding-next"
              >
                <Text style={styles.nextBtnText}>
                  {step < 3 ? "Continuar" : "Gerar Minha Meta"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  dropBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 22, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -0.5 },
  progressBar: { flexDirection: "row", gap: 8, marginBottom: 24 },
  progressDot: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 17,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activityRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#E0F4FA",
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  activitySub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 8,
  },
  timeText: { flex: 1, fontSize: 20, fontWeight: "700", color: theme.colors.textPrimary },
  goalPreview: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: "center",
  },
  goalPreviewLabel: {
    color: "#90E0EF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  goalPreviewValue: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: -1,
  },
  goalUnit: { fontSize: 18, fontWeight: "600" },
  goalPreviewSub: { color: "#CAF0F8", fontSize: 13, marginTop: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backBtnText: { fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  nextBtnDisabled: { backgroundColor: theme.colors.textDisabled },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
