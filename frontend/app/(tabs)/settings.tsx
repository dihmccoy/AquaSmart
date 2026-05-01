import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../src/theme";
import {
  clearProfile,
  getProfile,
  saveProfile,
  type ActivityLevel,
  type UserProfile,
} from "../../src/storage";
import { calculateDailyGoal, formatTime } from "../../src/calc";
import {
  cancelAllReminders,
  ensurePermissions,
  scheduleSmartReminders,
} from "../../src/notifications";

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentário",
  moderate: "Moderado",
  active: "Ativo",
};

export default function Settings() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editField, setEditField] = useState<null | "weight" | "age" | "cup" | "activity">(null);
  const [tempValue, setTempValue] = useState("");
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);

  const load = useCallback(async () => {
    const p = await getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = async (next: UserProfile) => {
    next.dailyGoalMl = calculateDailyGoal(next.weight, next.age, next.activity);
    await saveProfile(next);
    setProfile(next);
    if (next.notificationsEnabled) {
      const granted = await ensurePermissions();
      if (granted) await scheduleSmartReminders(next);
    } else {
      await cancelAllReminders();
    }
  };

  const toggleNotif = async (val: boolean) => {
    if (!profile) return;
    if (val) {
      const granted = await ensurePermissions();
      if (!granted && Platform.OS !== "web") {
        Alert.alert(
          "Permissão necessária",
          "Habilite as notificações nas configurações do sistema."
        );
        return;
      }
    }
    await persist({ ...profile, notificationsEnabled: val });
  };

  const openEdit = (field: "weight" | "age" | "cup" | "activity") => {
    if (!profile) return;
    if (field === "weight") setTempValue(String(profile.weight));
    else if (field === "age") setTempValue(String(profile.age));
    else if (field === "cup") setTempValue(String(profile.cupSizeMl));
    setEditField(field);
  };

  const confirmEdit = async () => {
    if (!profile || !editField) return;
    if (editField === "weight") {
      const v = parseFloat(tempValue.replace(",", "."));
      if (isNaN(v) || v < 20 || v > 300) {
        Alert.alert("Inválido", "Peso entre 20 e 300 kg.");
        return;
      }
      await persist({ ...profile, weight: v });
    } else if (editField === "age") {
      const v = parseInt(tempValue, 10);
      if (isNaN(v) || v < 5 || v > 110) {
        Alert.alert("Inválido", "Idade entre 5 e 110 anos.");
        return;
      }
      await persist({ ...profile, age: v });
    } else if (editField === "cup") {
      const v = parseInt(tempValue, 10);
      if (isNaN(v) || v < 50 || v > 2000) {
        Alert.alert("Inválido", "Tamanho do copo entre 50 e 2000 ml.");
        return;
      }
      await persist({ ...profile, cupSizeMl: v });
    }
    setEditField(null);
  };

  const setActivity = async (a: ActivityLevel) => {
    if (!profile) return;
    await persist({ ...profile, activity: a });
    setEditField(null);
  };

  const onWakeChange = async (_: any, d?: Date) => {
    setShowWakePicker(Platform.OS === "ios");
    if (!d || !profile) return;
    await persist({
      ...profile,
      wakeHour: d.getHours(),
      wakeMinute: d.getMinutes(),
    });
  };

  const onSleepChange = async (_: any, d?: Date) => {
    setShowSleepPicker(Platform.OS === "ios");
    if (!d || !profile) return;
    await persist({
      ...profile,
      sleepHour: d.getHours(),
      sleepMinute: d.getMinutes(),
    });
  };

  const handleReset = () => {
    Alert.alert(
      "Resetar dados",
      "Isso apagará seu perfil, histórico e conquistas. Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: async () => {
            await clearProfile();
            await cancelAllReminders();
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  if (!profile) return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="settings-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Personalize seu plano de hidratação</Text>

        {/* Goal preview */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>SUA META DIÁRIA</Text>
          <Text style={styles.goalValue}>
            {profile.dailyGoalMl} <Text style={styles.goalUnit}>ml</Text>
          </Text>
          <Text style={styles.goalSub}>
            Calculada com base em {profile.weight}kg • {profile.age} anos •{" "}
            {ACTIVITY_LABELS[profile.activity]}
          </Text>
        </View>

        <Section title="Perfil">
          <Row
            icon="person-outline"
            label="Peso"
            value={`${profile.weight} kg`}
            onPress={() => openEdit("weight")}
            testID="row-weight"
          />
          <Row
            icon="calendar-outline"
            label="Idade"
            value={`${profile.age} anos`}
            onPress={() => openEdit("age")}
            testID="row-age"
          />
          <Row
            icon="walk-outline"
            label="Atividade"
            value={ACTIVITY_LABELS[profile.activity]}
            onPress={() => openEdit("activity")}
            testID="row-activity"
          />
        </Section>

        <Section title="Notificações & Sono">
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Notificações inteligentes</Text>
              <Text style={styles.rowSub}>Pausa automaticamente durante o sono</Text>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={toggleNotif}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={profile.notificationsEnabled ? theme.colors.primary : "#fff"}
              testID="toggle-notifications"
            />
          </View>
          <Row
            icon="sunny-outline"
            label="Acordar"
            value={formatTime(profile.wakeHour, profile.wakeMinute)}
            onPress={() => setShowWakePicker(true)}
            testID="row-wake"
          />
          <Row
            icon="moon-outline"
            label="Dormir"
            value={formatTime(profile.sleepHour, profile.sleepMinute)}
            onPress={() => setShowSleepPicker(true)}
            testID="row-sleep"
          />
        </Section>

        <Section title="Preferências">
          <Row
            icon="cafe-outline"
            label="Copo padrão"
            value={`${profile.cupSizeMl} ml`}
            onPress={() => openEdit("cup")}
            testID="row-cup"
          />
        </Section>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset} testID="reset-data">
          <Ionicons name="trash-outline" size={18} color={theme.colors.alert} />
          <Text style={styles.dangerText}>Resetar todos os dados</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>AquaSmart • v1.0</Text>
      </ScrollView>

      {showWakePicker && (
        <DateTimePicker
          value={new Date(2024, 0, 1, profile.wakeHour, profile.wakeMinute)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onWakeChange}
        />
      )}
      {showSleepPicker && (
        <DateTimePicker
          value={new Date(2024, 0, 1, profile.sleepHour, profile.sleepMinute)}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onSleepChange}
        />
      )}

      {/* Edit modal */}
      <Modal
        visible={editField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditField(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            {editField === "activity" ? (
              <>
                <Text style={styles.modalTitle}>Nível de atividade</Text>
                {(["sedentary", "moderate", "active"] as ActivityLevel[]).map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.activityOption,
                      profile.activity === a && styles.activityOptionActive,
                    ]}
                    onPress={() => setActivity(a)}
                    testID={`activity-opt-${a}`}
                  >
                    <Text style={styles.activityOptionText}>{ACTIVITY_LABELS[a]}</Text>
                    {profile.activity === a && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setEditField(null)}
                >
                  <Text style={styles.modalCancelText}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  {editField === "weight"
                    ? "Atualizar peso"
                    : editField === "age"
                    ? "Atualizar idade"
                    : "Tamanho do copo"}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  keyboardType="numeric"
                  autoFocus
                  testID="input-edit-value"
                />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setEditField(null)}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={confirmEdit}
                    testID="confirm-edit"
                  >
                    <Text style={styles.modalConfirmText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.section}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} testID={testID} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 24, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  goalCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0077B6",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  goalLabel: { color: "#90E0EF", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  goalValue: { color: "#fff", fontSize: 48, fontWeight: "800", letterSpacing: -1.5, marginTop: 4 },
  goalUnit: { fontSize: 18, fontWeight: "600" },
  goalSub: { color: "#CAF0F8", fontSize: 12, marginTop: 4, textAlign: "center", fontWeight: "600" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceAlt,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F4FA",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: theme.colors.textPrimary },
  rowSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, fontWeight: "500" },
  rowValue: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: "700" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE7E5",
    padding: 16,
    borderRadius: theme.radius.pill,
    marginTop: 24,
  },
  dangerText: { color: theme.colors.alert, fontWeight: "700", fontSize: 14 },
  footer: { textAlign: "center", color: theme.colors.textDisabled, fontSize: 12, marginTop: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,48,71,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: 24 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
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
    marginTop: 12,
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
  activityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activityOptionActive: { borderColor: theme.colors.primary, backgroundColor: "#E0F4FA" },
  activityOptionText: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
});
