import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '../../hooks/useFamily';
import { useState } from 'react';

export default function FamilyScreen() {
  const { familyMembers, custodySchedule, sharedCommitments, loading, refresh, getTodaysCustody, getUpcomingCommitments, toggleCommitment } = useFamily();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const todaysCustody = getTodaysCustody();
  const upcomingCommitments = getUpcomingCommitments(7);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const daysUntil = (dateString: string): number => {
    const due = new Date(dateString);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Family Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Family</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading family data...</Text>
        ) : familyMembers.length === 0 ? (
          <Text style={styles.emptyText}>No family members added yet</Text>
        ) : (
          <View style={styles.familyList}>
            {familyMembers.map((member, index) => (
              <View key={member.id} style={[styles.familyCard, index > 0 && styles.familyCardBorder]}>
                <View style={styles.familyIcon}>
                  <Ionicons name="person-circle" size={40} color="#FF6B6B" />
                </View>
                <View style={styles.familyInfo}>
                  <Text style={styles.familyName}>{member.name}</Text>
                  <Text style={styles.familyDetail}>{member.age} years old</Text>
                  <Text style={styles.familyDetail}>{member.school}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Today's Custody Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Custody</Text>
          <Ionicons name="calendar" size={16} color="#999" />
        </View>
        {todaysCustody.length === 0 ? (
          <Text style={styles.emptyText}>No handoffs today</Text>
        ) : (
          <View style={styles.custodyList}>
            {todaysCustody.map((event, index) => (
              <View key={event.id} style={[styles.custodyCard, index > 0 && styles.custodyCardBorder]}>
                <View style={styles.custodyTypeIcon}>
                  <Ionicons
                    name={event.type === 'pickup' ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={24}
                    color={event.type === 'pickup' ? '#4ECDC4' : '#FFB627'}
                  />
                </View>
                <View style={styles.custodyInfo}>
                  <Text style={styles.custodyTime}>{formatTime(event.time)}</Text>
                  <Text style={styles.custodyChild}>{event.childName}</Text>
                  <Text style={styles.custodyLocation}>{event.location}</Text>
                </View>
                <View style={styles.custodyWith}>
                  <Text style={styles.custodyWithText}>{event.with}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Shared Commitments (Next 7 Days) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shared Commitments</Text>
          <Text style={styles.commitmentCount}>{upcomingCommitments.filter(c => !c.completed).length}</Text>
        </View>
        {upcomingCommitments.length === 0 ? (
          <Text style={styles.emptyText}>No upcoming commitments</Text>
        ) : (
          <View style={styles.commitmentList}>
            {upcomingCommitments.map((commitment, index) => (
              <TouchableOpacity
                key={commitment.id}
                style={[styles.commitmentCard, index > 0 && styles.commitmentCardBorder]}
                onPress={() => toggleCommitment(commitment.id)}
              >
                <View style={styles.commitmentCheckbox}>
                  {commitment.completed ? (
                    <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#999" />
                  )}
                </View>

                <View style={styles.commitmentInfo}>
                  <Text style={[styles.commitmentTitle, commitment.completed && styles.commitmentDone]}>
                    {commitment.title}
                  </Text>
                  <Text style={styles.commitmentType}>
                    {commitment.type.charAt(0).toUpperCase() + commitment.type.slice(1)} • Due in {daysUntil(commitment.dueDate)}d
                  </Text>
                  <View style={styles.assigneeBadges}>
                    {commitment.assignedTo.map((person, i) => (
                      <View key={i} style={styles.assigneeBadge}>
                        <Text style={styles.assigneeBadgeText}>{person}</Text>
                      </View>
                    ))}
                  </View>
                  {commitment.notes && <Text style={styles.commitmentNotes}>{commitment.notes}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#FF6B6B" />
          <Text style={styles.statNumber}>{familyMembers.length}</Text>
          <Text style={styles.statLabel}>Family members</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="swap-vertical" size={24} color="#4ECDC4" />
          <Text style={styles.statNumber}>{todaysCustody.length}</Text>
          <Text style={styles.statLabel}>Handoffs today</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkbox" size={24} color="#FFB627" />
          <Text style={styles.statNumber}>{upcomingCommitments.filter(c => !c.completed).length}</Text>
          <Text style={styles.statLabel}>Open tasks</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  commitmentCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
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
  familyList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  familyCardBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  familyIcon: {
    width: 50,
    alignItems: 'center',
  },
  familyInfo: {
    flex: 1,
  },
  familyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  familyDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  custodyList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  custodyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  custodyCardBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  custodyTypeIcon: {
    width: 40,
    alignItems: 'center',
  },
  custodyInfo: {
    flex: 1,
  },
  custodyTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  custodyChild: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  custodyLocation: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  custodyWith: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
  },
  custodyWithText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  commitmentList: {
    gap: 8,
  },
  commitmentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  commitmentCardBorder: {},
  commitmentCheckbox: {
    width: 30,
    paddingTop: 2,
  },
  commitmentInfo: {
    flex: 1,
  },
  commitmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  commitmentDone: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  commitmentType: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  assigneeBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  assigneeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#e0f4f7',
    borderRadius: 4,
  },
  assigneeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#45B7D1',
  },
  commitmentNotes: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
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
