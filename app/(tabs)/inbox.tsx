import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGmailActionItems } from '../../hooks/useGmailActionItems';
import { useState } from 'react';

type UrgencyFilter = 'all' | 'high' | 'medium' | 'low';

export default function InboxScreen() {
  const { items, loading, refresh } = useGmailActionItems();
  const [refreshing, setRefreshing] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredItems = urgencyFilter === 'all' ? items : items.filter(i => i.urgency === urgencyFilter);

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'reply':
        return 'mail-unread';
      case 'task':
        return 'checkbox';
      case 'decision':
        return 'help-circle';
      case 'waiting':
        return 'hourglass';
      case 'fyi':
        return 'information-circle';
      default:
        return 'mail';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'reply':
        return 'Reply needed';
      case 'task':
        return 'Task';
      case 'decision':
        return 'Decision';
      case 'waiting':
        return 'Waiting on';
      case 'fyi':
        return 'FYI';
      default:
        return actionType;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'reply':
        return '#FF6B6B';
      case 'task':
        return '#4ECDC4';
      case 'decision':
        return '#FFB627';
      case 'waiting':
        return '#A29BFE';
      case 'fyi':
        return '#95E1D3';
      default:
        return '#999';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFA07A';
      case 'low':
        return '#90EE90';
      default:
        return '#999';
    }
  };

  const timeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Urgency Filter */}
      <View style={styles.filterBar}>
        {(['all', 'high', 'medium', 'low'] as UrgencyFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, urgencyFilter === filter && styles.filterButtonActive]}
            onPress={() => setUrgencyFilter(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                urgencyFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Action Items ({filteredItems.length})
        </Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading emails...</Text>
        ) : filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>No action items</Text>
        ) : (
          <View style={styles.itemsList}>
            {filteredItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, index > 0 && styles.itemCardBorder]}
              >
                {/* Urgency indicator bar */}
                <View
                  style={[
                    styles.urgencyBar,
                    { backgroundColor: getUrgencyColor(item.urgency) },
                  ]}
                />

                <View style={styles.itemContent}>
                  {/* Header: Action type + time */}
                  <View style={styles.itemHeader}>
                    <View style={styles.actionTypeBadge}>
                      <Ionicons
                        name={getActionTypeIcon(item.actionType)}
                        size={14}
                        color={getActionTypeColor(item.actionType)}
                      />
                      <Text
                        style={[
                          styles.actionTypeLabel,
                          { color: getActionTypeColor(item.actionType) },
                        ]}
                      >
                        {getActionTypeLabel(item.actionType)}
                      </Text>
                    </View>
                    <Text style={styles.itemTime}>{timeAgo(item.receivedAt)}</Text>
                  </View>

                  {/* From */}
                  <Text style={styles.itemFrom}>{item.from}</Text>

                  {/* Subject */}
                  <Text style={styles.itemSubject} numberOfLines={2}>
                    {item.subject}
                  </Text>

                  {/* Preview */}
                  <Text style={styles.itemPreview} numberOfLines={2}>
                    {item.preview}
                  </Text>

                  {/* Action button */}
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Open</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Summary stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color="#FF6B6B" />
          <Text style={styles.statNumber}>{items.filter(i => i.urgency === 'high').length}</Text>
          <Text style={styles.statLabel}>High priority</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="clock" size={24} color="#FFA07A" />
          <Text style={styles.statNumber}>{items.filter(i => i.urgency === 'medium').length}</Text>
          <Text style={styles.statLabel}>Medium</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#90EE90" />
          <Text style={styles.statNumber}>{items.filter(i => i.urgency === 'low').length}</Text>
          <Text style={styles.statLabel}>Low</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemCardBorder: {
    marginTop: 0,
  },
  urgencyBar: {
    height: 3,
    width: '100%',
  },
  itemContent: {
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionTypeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
  },
  itemFrom: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPreview: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
});
