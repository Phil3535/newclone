import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { appointmentsApi, leadsApi } from '../../src/services/api';
import { useStore } from '../../src/store/useStore';
import { scheduleAppointmentReminder, cancelAppointmentReminder } from '../../src/services/notifications';
import { useLanguage } from '../../src/contexts/LanguageContext';

interface Appointment {
  id: string;
  lead_id: string;
  rep_id: string;
  lead_name: string;
  lead_address: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  outcome?: string;
}

interface Lead {
  id: string;
  name: string;
  address: string;
  status: string;
}

export default function CalendarScreen() {
  const { currentRepId } = useStore();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);

  // New appointment form
  const [newAppointment, setNewAppointment] = useState({
    lead_id: '',
    scheduled_date: '',
    scheduled_time: '10:00',
    duration_minutes: '60',
    notes: '',
  });

  const loadData = useCallback(async () => {
    if (!currentRepId) return;
    try {
      const [appointmentsRes, leadsRes] = await Promise.all([
        appointmentsApi.getAll({ rep_id: currentRepId }),
        leadsApi.getAll({ rep_id: currentRepId, status: 'qualified' }),
      ]);
      setAppointments(appointmentsRes.data);
      setAvailableLeads(leadsRes.data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentRepId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Generate week days
  const generateWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  };

  const weekDays = generateWeekDays();

  // Filter appointments for selected date
  const dayAppointments = appointments.filter((appt) => {
    const apptDate = parseISO(appt.scheduled_time);
    return isSameDay(apptDate, selectedDate);
  }).sort((a, b) => 
    new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
  );

  // Count appointments per day for the week
  const getAppointmentCount = (date: Date) => {
    return appointments.filter((appt) => {
      const apptDate = parseISO(appt.scheduled_time);
      return isSameDay(apptDate, date);
    }).length;
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.lead_id || !newAppointment.scheduled_date) {
      Alert.alert('Error', 'Please select a lead and date');
      return;
    }

    if (!currentRepId) {
      Alert.alert('Error', 'No rep selected');
      return;
    }

    setCreating(true);
    try {
      const scheduledDateTime = new Date(
        `${newAppointment.scheduled_date}T${newAppointment.scheduled_time}:00`
      );

      const response = await appointmentsApi.create({
        lead_id: newAppointment.lead_id,
        rep_id: currentRepId,
        scheduled_time: scheduledDateTime.toISOString(),
        duration_minutes: parseInt(newAppointment.duration_minutes),
        notes: newAppointment.notes,
      });

      // Schedule notification reminder (30 minutes before)
      const lead = availableLeads.find(l => l.id === newAppointment.lead_id);
      if (lead && response.data?.id) {
        await scheduleAppointmentReminder(
          response.data.id,
          lead.name,
          lead.address,
          scheduledDateTime,
          30 // 30 minutes before
        );
      }

      setShowNewModal(false);
      setNewAppointment({
        lead_id: '',
        scheduled_date: '',
        scheduled_time: '10:00',
        duration_minutes: '60',
        notes: '',
      });
      await loadData();
      Alert.alert('Success', 'Appointment scheduled with reminder notification!');
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (apptId: string, newStatus: string, outcome?: string) => {
    try {
      const updates: any = { status: newStatus };
      if (outcome) updates.outcome = outcome;
      
      // Cancel notification if appointment is cancelled or completed
      if (newStatus === 'cancelled' || newStatus === 'completed' || newStatus === 'no_show') {
        await cancelAppointmentReminder(apptId);
      }
      
      await appointmentsApi.update(apptId, updates);
      await loadData();
      setShowDetailModal(false);
      Alert.alert('Success', 'Appointment updated!');
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment');
    }
  };

  // Open Google Maps for navigation
  const openNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://app?daddr=${encodedAddress}`,
      android: `google.navigation:q=${encodedAddress}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    });
    
    Linking.canOpenURL(url || '').then((supported) => {
      if (supported) {
        Linking.openURL(url || '');
      } else {
        // Fallback to web Google Maps
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`);
      }
    });
  };

  // Call the lead
  const callLead = (phone: string) => {
    const phoneUrl = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls not supported on this device');
      }
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: '#f59e0b',
      completed: '#22c55e',
      cancelled: '#ef4444',
      no_show: '#64748b',
    };
    return colors[status] || '#64748b';
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => {
          setSelectedAppointment(item);
          setShowDetailModal(true);
        }}
      >
        <View style={[styles.appointmentTimeline, { backgroundColor: statusColor }]} />
        <View style={styles.appointmentContent}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.appointmentTime}>{formatTime(item.scheduled_time)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.appointmentName}>{item.lead_name}</Text>
          <View style={styles.appointmentLocation}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.appointmentAddress}>{item.lead_address}</Text>
          </View>
          <View style={styles.appointmentDuration}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.durationText}>{item.duration_minutes} min</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} data-testid="calendar-screen">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title} data-testid="calendar-title">{t('calendar.title')}</Text>
          <Text style={styles.subtitle}>{t('calendar.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setNewAppointment({
              ...newAppointment,
              scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
            });
            setShowNewModal(true);
          }}
          data-testid="add-appointment-button"
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav} data-testid="month-navigation">
        <TouchableOpacity
          onPress={() => setSelectedDate(addDays(selectedDate, -7))}
          data-testid="prev-week-button"
        >
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.monthText} data-testid="current-month">{format(selectedDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          onPress={() => setSelectedDate(addDays(selectedDate, 7))}
          data-testid="next-week-button"
        >
          <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Week View */}
      <View style={styles.weekContainer} data-testid="week-view">
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const appointmentCount = getAppointmentCount(day);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayItem,
                isSelected && styles.dayItemSelected,
                isToday && !isSelected && styles.dayItemToday,
              ]}
              onPress={() => setSelectedDate(day)}
              data-testid={`day-button-${format(day, 'yyyy-MM-dd')}`}
            >
              <Text style={[
                styles.dayName,
                isSelected && styles.dayTextSelected,
              ]}>
                {format(day, 'EEE')}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSelected && styles.dayTextSelected,
                isToday && !isSelected && styles.dayNumberToday,
              ]}>
                {format(day, 'd')}
              </Text>
              {appointmentCount > 0 && (
                <View style={[
                  styles.appointmentDot,
                  isSelected && styles.appointmentDotSelected,
                ]}>
                  <Text style={styles.appointmentDotText}>{appointmentCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Date Header */}
      <View style={styles.selectedDateHeader}>
        <Text style={styles.selectedDateText}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        <Text style={styles.appointmentCountText}>
          {dayAppointments.length} {t('calendar.appointments')}
        </Text>
      </View>

      {/* Appointments List */}
      <FlatList
        data={dayAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#1e3a5f" />
            <Text style={styles.emptyText}>{t('calendar.no_appointments')}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                setNewAppointment({
                  ...newAppointment,
                  scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
                });
                setShowNewModal(true);
              }}
            >
              <Text style={styles.emptyButtonText}>{t('calendar.schedule_appointment')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* New Appointment Modal */}
      <Modal visible={showNewModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('calendar.schedule_appointment')}</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('calendar.select_lead')} *</Text>
              <View style={styles.leadSelector}>
                {availableLeads.length === 0 ? (
                  <Text style={styles.noLeadsText}>{t('calendar.no_qualified_leads')}</Text>
                ) : (
                  availableLeads.map((lead) => (
                    <TouchableOpacity
                      key={lead.id}
                      style={[
                        styles.leadOption,
                        newAppointment.lead_id === lead.id && styles.leadOptionActive,
                      ]}
                      onPress={() => setNewAppointment({ ...newAppointment, lead_id: lead.id })}
                    >
                      <Text style={[
                        styles.leadOptionName,
                        newAppointment.lead_id === lead.id && styles.leadOptionNameActive,
                      ]}>
                        {lead.name}
                      </Text>
                      <Text style={styles.leadOptionAddress}>{lead.address}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <Text style={styles.inputLabel}>{t('calendar.date')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={newAppointment.scheduled_date}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, scheduled_date: text })
                }
              />

              <Text style={styles.inputLabel}>{t('calendar.time')} *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (24h format)"
                placeholderTextColor="#64748b"
                value={newAppointment.scheduled_time}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, scheduled_time: text })
                }
              />

              <Text style={styles.inputLabel}>{t('calendar.duration')}</Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={newAppointment.duration_minutes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, duration_minutes: text })
                }
              />

              <Text style={styles.inputLabel}>{t('leads.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('leads.notes')}
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={3}
                value={newAppointment.notes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, notes: text })
                }
              />

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateAppointment}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>{t('calendar.schedule')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('calendar.appointment_details')}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={20} color="#64748b" />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>{t('leads.title')}</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.lead_name}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#64748b" />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>{t('leads.address')}</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.lead_address}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={20} color="#64748b" />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>{t('calendar.time')}</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(selectedAppointment.scheduled_time)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="hourglass" size={20} color="#64748b" />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>{t('calendar.duration')}</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.duration_minutes} {t('calendar.minutes')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openNavigation(selectedAppointment.lead_address)}
                  >
                    <Ionicons name="navigate" size={20} color="#ffffff" />
                    <Text style={styles.actionButtonText}>{t('calendar.navigate')}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.statusSectionTitle}>{t('leads.update_status')}</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedAppointment.status === 'completed' && styles.statusButtonActive,
                    ]}
                    onPress={() => handleUpdateStatus(selectedAppointment.id, 'completed', 'Completed successfully')}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    <Text style={styles.statusButtonText}>{t('calendar.completed')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedAppointment.status === 'no_show' && styles.statusButtonActive,
                    ]}
                    onPress={() => handleUpdateStatus(selectedAppointment.id, 'no_show', 'No show')}
                  >
                    <Ionicons name="close-circle" size={24} color="#64748b" />
                    <Text style={styles.statusButtonText}>{t('calendar.no_show')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      selectedAppointment.status === 'cancelled' && styles.statusButtonActive,
                    ]}
                    onPress={() => handleUpdateStatus(selectedAppointment.id, 'cancelled', 'Cancelled')}
                  >
                    <Ionicons name="ban" size={24} color="#ef4444" />
                    <Text style={styles.statusButtonText}>{t('calendar.cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  monthText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  weekContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 46,
  },
  dayItemSelected: {
    backgroundColor: '#f59e0b',
  },
  dayItemToday: {
    backgroundColor: '#1e3a5f',
  },
  dayName: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
  },
  dayNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  dayNumberToday: {
    color: '#f59e0b',
  },
  appointmentDot: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  appointmentDotSelected: {
    backgroundColor: '#ffffff',
  },
  appointmentDotText: {
    color: '#0a1628',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  selectedDateText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentCountText: {
    color: '#64748b',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  appointmentTimeline: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    minHeight: 60,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  appointmentTime: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appointmentName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  appointmentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  appointmentAddress: {
    color: '#64748b',
    fontSize: 12,
  },
  appointmentDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 12,
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  leadSelector: {
    maxHeight: 200,
  },
  noLeadsText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  leadOption: {
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  leadOptionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b10',
  },
  leadOptionName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  leadOptionNameActive: {
    color: '#f59e0b',
  },
  leadOptionAddress: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#0f1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  detailInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 15,
    marginTop: 2,
  },
  statusSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statusButtonActive: {
    borderColor: '#f59e0b',
  },
  statusButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
