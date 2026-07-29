import cv2
import numpy as np
import os
import kagglehub
from typing import Dict, Any

class LightweightDiseaseMatcher:
    """
    Backend service that links a Kaggle fruit/vegetable disease dataset 
    and handles image histogram comparisons using OpenCV.
    """
    def __init__(self):
        print("Linking Kaggle dataset signatures...")
        # Automatically downloads or points to the global system cache for the dataset
        self.dataset_dir = kagglehub.dataset_download(
            "muhammad0subhan/fruit-and-vegetable-disease-healthy-vs-rotten"
        )
        print(f"Dataset successfully linked at: {self.dataset_dir}")

    def _calculate_histogram(self, image: np.ndarray) -> np.ndarray:
        """Resizes the image matrix and returns its normalized HSV color histogram."""
        resized = cv2.resize(image, (128, 128))
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        return hist

    def find_matching_condition(self, uploaded_img_bytes: bytes) -> Dict[str, Any]:
        """
        Processes raw uploaded image bytes and cross-references them against 
        the linked Kaggle directory using histogram correlation.
        """
        # Reconstruct image matrix from raw byte stream
        np_arr = np.frombuffer(uploaded_img_bytes, np.uint8)
        uploaded_matrix = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if uploaded_matrix is None:
            return {"status": "error", "message": "Invalid uploaded image matrix"}

        uploaded_hist = self._calculate_histogram(uploaded_matrix)
        best_match_name = None
        best_score = -1

        image_extensions = ('.png', '.jpg', '.jpeg', '.webp')

        # Walk through the unzipped Kaggle folder tree structure
        for root, dirs, files in os.walk(self.dataset_dir):
            for file in files:
                if file.lower().endswith(image_extensions):
                    file_path = os.path.join(root, file)
                    
                    dataset_img = cv2.imread(file_path)
                    if dataset_img is None:
                        continue
                    
                    dataset_hist = self._calculate_histogram(dataset_img)
                    score = cv2.compareHist(uploaded_hist, dataset_hist, cv2.HISTCMP_CORREL)
                    
                    if score > best_score:
                        best_score = score
                        # Retain relative path to easily extract category labels
                        best_match_name = os.path.relpath(file_path, self.dataset_dir)

        if best_match_name and best_score > 0.4:
            # Extracts the folder category name (e.g., 'rotten_apple' or 'healthy_banana')
            inferred_label = os.path.dirname(best_match_name).replace('_', ' ')
            return {
                "status": "success",
                "inferred_label": inferred_label,
                "confidence": round(best_score * 100, 2),
                "match_file": best_match_name
            }
        
        return {
            "status": "inconclusive",
            "message": "No matching fruit or vegetable signatures found.",
            "confidence": round(best_score * 100, 2) if best_score > 0 else 0
        }