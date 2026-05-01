import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBridgeReachability } from "../hooks/useBridgeReachability";

/**
 * Sticky red banner shown above all screens when the bridge is unreachable.
 * Renders nothing while reachable. Tap to retry (forces a probe via a
 * fresh import to avoid creating a circular dep with the hook module).
 */
export function UnreachableBanner() {
  const { reachable, lastError } = useBridgeReachability();
  if (reachable) return null;

  const onRetry = async () => {
    const mod = await import("../hooks/useBridgeReachability");
    // Trigger an immediate probe by re-starting the monitor; idempotent.
    mod.startBridgeReachabilityMonitor();
  };

  return (
    <TouchableOpacity onPress={onRetry} style={styles.container} activeOpacity={0.8}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>CLEO bridge unreachable</Text>
        <Text style={styles.subtitle}>
          {lastError ? `${lastError.slice(0, 60)} — tap to retry` : "Tap to retry"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C0392B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  textWrap: { flex: 1 },
  title: { color: "#fff", fontSize: 13, fontWeight: "600" },
  subtitle: { color: "#FCE4E0", fontSize: 11 },
});
