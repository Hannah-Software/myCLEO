import { bridgeClient } from '../../utils/bridge-client';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList } from 'react-native';

/**
 * Documents Screen — File Vault & Upload
 *
 * Allows users to:
 * - Upload documents (drag-and-drop in web, file picker in mobile)
 * - Organize into folders/categories
 * - View document history
 * - Tag and search documents
 *
 * Calls: GET /documents, POST /documents via FastAPI bridge
 */

interface Document {
  id: string;
  name: string;
  type: string; // pdf, docx, image, etc.
  size: number;
  uploaded_at: string;
  tags: string[];
}

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, recent, pdf, image, etc.

  // Fetch documents from CLEO daemon
  const fetchDocuments = async () => {
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';
      const res = await Promise.resolve(await bridgeClient.getDocuments() as any);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    if (filter === 'all') return true;
    if (filter === 'recent') return true; // sort by date
    return doc.type === filter;
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${baseUrl}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        // Refresh documents list
        fetchDocuments();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.subtitle}>Your File Vault</Text>
      </View>

      {/* Upload Zone */}
      <View style={styles.uploadZone}>
        <Text style={styles.uploadText}>📁</Text>
        <Text style={styles.uploadTitle}>Drag and drop to upload</Text>
        <Text style={styles.uploadSubtext}>or click to select files</Text>
        {uploading && <ActivityIndicator style={styles.uploadSpinner} />}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'recent', 'pdf', 'image'].map((f) => (
          <View
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive,
            ]}
          >
            <Text style={[
              styles.filterTabText,
              filter === f && styles.filterTabTextActive,
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Documents List */}
      <View style={styles.documentsList}>
        <Text style={styles.listTitle}>
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
        </Text>
        {filteredDocs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>Upload a file to get started</Text>
          </View>
        ) : (
          filteredDocs.map((doc) => (
            <View key={doc.id} style={styles.documentItem}>
              <View style={styles.docIcon}>
                <Text>{getFileIcon(doc.type)}</Text>
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docMeta}>
                  {formatFileSize(doc.size)} • {formatDate(doc.uploaded_at)}
                </Text>
                {doc.tags.length > 0 && (
                  <View style={styles.docTags}>
                    {doc.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.docAction}>⋮</Text>
            </View>
          ))
        )}
      </View>

      {/* Categories Info */}
      <View style={styles.info}>
        <Text style={styles.infoTitle}>📦 Storage</Text>
        <View style={styles.storageBar}>
          <View
            style={[
              styles.storageUsed,
              { width: '35%' }, // 350MB of 1GB
            ]}
          />
        </View>
        <Text style={styles.storageText}>350 MB of 1 GB used</Text>
      </View>
    </ScrollView>
  );
}

function getFileIcon(type: string): string {
  switch (type) {
    case 'pdf': return '📄';
    case 'image': return '🖼️';
    case 'docx': return '📝';
    case 'xlsx': return '📊';
    default: return '📎';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  uploadZone: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
  },
  uploadSpinner: {
    marginTop: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#0066cc',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  documentsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  docIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  docTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f7ff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#0066cc',
  },
  docAction: {
    fontSize: 18,
    color: '#ccc',
  },
  info: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storageUsed: {
    height: '100%',
    backgroundColor: '#0066cc',
  },
  storageText: {
    fontSize: 12,
    color: '#999',
  },
});
