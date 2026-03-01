import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Photo {
  id: string;
  uri: string;
  type: 'roof' | 'utility_bill' | 'home' | 'other';
  caption?: string;
  createdAt: string;
  leadId?: string;
}

const PHOTO_TYPES = [
  { id: 'roof', label: 'Roof', icon: 'home', color: '#f59e0b' },
  { id: 'utility_bill', label: 'Utility Bill', icon: 'document-text', color: '#3b82f6' },
  { id: 'home', label: 'Home Exterior', icon: 'business', color: '#22c55e' },
  { id: 'other', label: 'Other', icon: 'images', color: '#8b5cf6' },
];

export default function PhotoGalleryScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await AsyncStorage.getItem('lead_photos');
      if (data) {
        setPhotos(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePhotos = async (newPhotos: Photo[]) => {
    try {
      await AsyncStorage.setItem('lead_photos', JSON.stringify(newPhotos));
    } catch (error) {
      console.error('Error saving photos:', error);
    }
  };

  const pickImage = async (type: string) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take photos');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: true,
            });
            if (!result.canceled) {
              addPhoto(result.assets[0].uri, type);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              allowsEditing: true,
            });
            if (!result.canceled) {
              addPhoto(result.assets[0].uri, type);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const addPhoto = async (uri: string, type: string) => {
    const newPhoto: Photo = {
      id: Date.now().toString(),
      uri,
      type: type as Photo['type'],
      createdAt: new Date().toISOString(),
    };
    const newPhotos = [newPhoto, ...photos];
    setPhotos(newPhotos);
    await savePhotos(newPhotos);
    Alert.alert('Success', 'Photo added successfully!');
  };

  const deletePhoto = (id: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newPhotos = photos.filter(p => p.id !== id);
            setPhotos(newPhotos);
            await savePhotos(newPhotos);
          },
        },
      ]
    );
  };

  const filteredPhotos = selectedType 
    ? photos.filter(p => p.type === selectedType)
    : photos;

  const renderPhoto = ({ item }: { item: Photo }) => {
    const typeInfo = PHOTO_TYPES.find(t => t.id === item.type);
    return (
      <View style={styles.photoCard}>
        <Image source={{ uri: item.uri }} style={styles.photoImage} />
        <View style={styles.photoOverlay}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo?.color || '#64748b' }]}>
            <Ionicons name={typeInfo?.icon as any || 'image'} size={12} color="#ffffff" />
            <Text style={styles.typeText}>{typeInfo?.label || 'Photo'}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(item.id)}>
            <Ionicons name="trash" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Photo Gallery</Text>
          <Text style={styles.subtitle}>{photos.length} Photos</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddSection}>
        <Text style={styles.sectionLabel}>Quick Add</Text>
        <View style={styles.quickAddGrid}>
          {PHOTO_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.quickAddBtn, { backgroundColor: `${type.color}20` }]}
              onPress={() => pickImage(type.id)}
            >
              <Ionicons name={type.icon as any} size={24} color={type.color} />
              <Text style={[styles.quickAddText, { color: type.color }]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterBtn, !selectedType && styles.filterBtnActive]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[styles.filterText, !selectedType && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {PHOTO_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.filterBtn, selectedType === type.id && styles.filterBtnActive]}
            onPress={() => setSelectedType(selectedType === type.id ? null : type.id)}
          >
            <Text style={[styles.filterText, selectedType === type.id && styles.filterTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Photos Grid */}
      <FlatList
        data={filteredPhotos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.photosGrid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#1e3a5f" />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptyHint}>Tap a category above to add photos</Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  quickAddSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAddGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAddBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickAddText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
  },
  filterBtnActive: {
    backgroundColor: '#f59e0b',
  },
  filterText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  photosGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  photoCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e3a5f',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 1,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
});
