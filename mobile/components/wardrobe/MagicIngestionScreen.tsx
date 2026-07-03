// components/wardrobe/MagicIngestionScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { processOnBodyPhotoAndDeconstruct, OnDeviceProcessingResult } from '../../services/image-processor';
import { addMagicExtractedItemsToWardrobe } from '../../services/wardrobe-local';

export const MagicIngestionScreen: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedItems, setExtractedItems] = useState<OnDeviceProcessingResult[]>([]);

  const handleMagicIngestion = async () => {
    setIsProcessing(true);
    setExtractedItems([]); // Har naye click par pichla data clear karein
    
    // Yahan aap camera ya gallery se aane wali real full-body image ka URI pass karenge
    const samplePhotoPath = 'file://assets/sample_on_body_look.jpg';
    
    try {
      console.log("[UI] Starting multi-apparel extraction loop...");
      
      // 1. Core image processing logic run karein (Segmentation + Skin filtering)
      const results = await processOnBodyPhotoAndDeconstruct(samplePhotoPath, false);
      
      // 2. State update karein takki screen par items dikhne lagein
      setExtractedItems(results);

      // 3. FIX: Database me batch save operation trigger karein aur user ko update dein
      if (results.length > 0) {
        await addMagicExtractedItemsToWardrobe(results, samplePhotoPath);
        
        Alert.alert(
          "🎉 Closet Updated!",
          `AI ne aapki look se ${results.length} items (Topwear + Bottomwear) successfully alag karke closet me save kar diye hain.`
        );
      } else {
        Alert.alert("⚠️ Ingestion Alert", "Photo me se alag-alag clothes extract nahi ho paye.");
      }

    } catch (error) {
      console.error("Ingestion failed:", error);
      Alert.alert("❌ Pipeline Error", "Processing ya database operation ke dauran dikkat aayi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Magic Wardrobe Ingestion</Text>
      <Text style={styles.subtitle}>
        Apni full-body photo upload karein. AI automatically aapke kapdon ko detect karke, skin aur background remove karke closet mein alag-alag add kar dega.
      </Text>

      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleMagicIngestion}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Process Full-Body Photo</Text>
        )}
      </TouchableOpacity>

      {extractedItems.length > 0 && (
        <View style={styles.resultsBox}>
          <Text style={styles.sectionHeader}>Detected Items ({extractedItems.length}):</Text>
          
          {extractedItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.metaRow}>
                <Text style={styles.categoryTag}>
                  {item.classification.category.toUpperCase()}
                </Text>
                <Text style={styles.confidenceText}>
                  Confidence: {(item.classification.confidence * 100).toFixed(0)}%
                </Text>
              </View>

              <Text style={styles.detailsText}>
                Sub-Category: {item.classification.subCategory}
              </Text>
              <Text style={styles.detailsText}>
                Dominant Color: {item.colors.dominantName}
              </Text>

              <View style={styles.badgeContainer}>
                <Text style={styles.successBadge}>
                  ✓ Background & Skin Artifacts Removed
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' }, // Clean Linen Background matching theme
  contentContainer: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 24 },
  actionButton: { backgroundColor: '#A0627A', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 12 }, // Dusty Rose Accent
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  resultsBox: { marginTop: 24 },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryTag: { backgroundColor: '#EEF2F6', color: '#1E40AF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '700' },
  confidenceText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  detailsText: { fontSize: 14, color: '#4B5563', marginTop: 4 },
  badgeContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  successBadge: { fontSize: 12, color: '#10B981', fontWeight: '500' }
});