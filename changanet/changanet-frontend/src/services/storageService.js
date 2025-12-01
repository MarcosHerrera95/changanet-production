import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getStorage } from "firebase/storage";
import { app } from "../config/firebaseConfig";

// Usar la instancia de storage ya inicializada
const storage = getStorage();

// Subir foto de perfil
export const uploadProfilePicture = async (userId, file) => {
  try {
    const storageRef = ref(storage, `profile-pictures/${userId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir foto de trabajo
export const uploadWorkPhoto = async (userId, jobId, file) => {
  try {
    const storageRef = ref(storage, `work-photos/${userId}/${jobId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir documento de verificación
export const uploadVerificationDocument = async (userId, file) => {
  try {
    const storageRef = ref(storage, `verification-documents/${userId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir imagen de chat
export const uploadChatImage = async (userId, otherUserId, file, fileName) => {
  try {
    const storageRef = ref(storage, `chats/${userId}-${otherUserId}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Eliminar archivo
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener URL de descarga
export const getFileURL = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
