/**
 * Main Application - Orchestrates encryption/decryption workflow
 */

import './style.css';
import { Encryptor } from './crypto/encryptor.js';
import { Decryptor } from './crypto/decryptor.js';
import { KeyManager } from './crypto/key-manager.js';
import { ChunkedFileReader } from './file-handling/chunked-reader.js';
import { BlobBuilder } from './file-handling/blob-builder.js';
import { Downloader } from './file-handling/downloader.js';
import { ImageViewer } from './media/image-viewer.js';
import { VideoPlayer } from './media/video-player.js';
import { memoryManager } from './media/memory-manager.js';
import { ProgressTracker } from './utils/progress.js';
import { FileValidator } from './utils/validation.js';
import CryptoWorker from './workers/crypto-worker.js?worker';
import { LSBEncoder } from './steganography/lsb-encoder.js';

// Initialize components
let encryptFile = null;
let decryptFile = null;
let worker = null;

const encryptProgressTracker = new ProgressTracker(
  document.getElementById('encrypt-progress-bar'),
  document.getElementById('encrypt-progress-text')
);

const decryptProgressTracker = new ProgressTracker(
  document.getElementById('decrypt-progress-bar'),
  document.getElementById('decrypt-progress-text')
);

const imageViewer = new ImageViewer(document.getElementById('media-preview'));
const videoPlayer = new VideoPlayer(document.getElementById('media-preview'));

// Initialize worker
function initWorker() {
  if (worker) {
    worker.terminate();
  }
  worker = new CryptoWorker();
}

initWorker();

// Helper: Show Status Message
function showStatus(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (!message) {
    element.classList.add('hidden');
    return;
  }

  element.classList.remove('hidden');
  element.textContent = message;
  
  // Reset colors
  element.classList.remove('text-red-400', 'text-green-400', 'text-blue-400', 'text-muted-foreground');
  
  switch (type) {
    case 'error':
      element.classList.add('text-red-400');
      break;
    case 'success':
      element.classList.add('text-green-400');
      break;
    case 'info':
    default:
      element.classList.add('text-blue-400');
      break;
  }
}

// ============= UI HANDLERS =============

// Tab Switching Logic
const tabEncrypt = document.getElementById('tab-encrypt');
const tabDecrypt = document.getElementById('tab-decrypt');
const tabStego = document.getElementById('tab-stego');
const sectionEncrypt = document.getElementById('encrypt-section');
const sectionDecrypt = document.getElementById('decrypt-section');
const sectionStego = document.getElementById('stego-section');

function switchTab(tab) {
  // Reset all
  [tabEncrypt, tabDecrypt, tabStego].forEach(t => t.dataset.state = 'inactive');
  [sectionEncrypt, sectionDecrypt, sectionStego].forEach(s => s.style.display = 'none');

  let activeTab, activeSection;

  if (tab === 'encrypt') {
    activeTab = tabEncrypt;
    activeSection = sectionEncrypt;
  } else if (tab === 'decrypt') {
    activeTab = tabDecrypt;
    activeSection = sectionDecrypt;
  } else if (tab === 'stego') {
    activeTab = tabStego;
    activeSection = sectionStego;
  }

  activeTab.dataset.state = 'active';
  activeSection.style.display = 'block';
  
  // Trigger animation
  activeSection.classList.remove('animate-in', 'fade-in', 'slide-in-from-bottom-4');
  void activeSection.offsetWidth; // trigger reflow
  activeSection.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom-4');
}

tabEncrypt.addEventListener('click', () => switchTab('encrypt'));
tabDecrypt.addEventListener('click', () => switchTab('decrypt'));
tabStego.addEventListener('click', () => switchTab('stego'));

// Initialize tabs
switchTab('encrypt');

// Password Visibility Toggle
const togglePasswordBtn = document.getElementById('toggle-password-visibility');
const encryptPasswordInput = document.getElementById('encrypt-password');

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const type = encryptPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    encryptPasswordInput.setAttribute('type', type);
    // Update icon (optional, but good for UX)
    const icon = togglePasswordBtn.querySelector('svg');
    if (type === 'text') {
      icon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="2" x2="22" y1="2" y2="22"/>'; // Strikethrough eye
    } else {
      icon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'; // Normal eye
    }
  });
}

// Password Strength Meter
encryptPasswordInput.addEventListener('input', (e) => {
  const password = e.target.value;
  const strengthBar = document.getElementById('password-strength-bar');
  const strengthText = document.getElementById('password-strength-text');
  
  let strength = 0;
  if (password.length > 0) strength += 10;
  if (password.length >= 8) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 30;

  strengthBar.style.width = `${strength}%`;
  
  if (strength < 30) {
    strengthBar.className = 'h-full bg-red-500 transition-all duration-300';
    strengthText.textContent = 'Strength: Weak';
  } else if (strength < 70) {
    strengthBar.className = 'h-full bg-yellow-500 transition-all duration-300';
    strengthText.textContent = 'Strength: Medium';
  } else {
    strengthBar.className = 'h-full bg-green-500 transition-all duration-300';
    strengthText.textContent = 'Strength: Strong';
  }
});

// ============= ENCRYPTION HANDLERS =============

document.getElementById('encrypt-file-input').addEventListener('change', (e) => {
  handleEncryptFileSelect(e.target.files[0]);
});

document.getElementById('use-password-encrypt').addEventListener('change', (e) => {
  const passwordContainer = document.getElementById('password-input-container');
  const passwordInput = document.getElementById('encrypt-password');
  
  if (e.target.checked) {
    passwordContainer.classList.remove('hidden');
    passwordInput.disabled = false;
    setTimeout(() => passwordInput.focus(), 50);
  } else {
    passwordContainer.classList.add('hidden');
    passwordInput.disabled = true;
    passwordInput.value = '';
  }
});

document.getElementById('encrypt-btn').addEventListener('click', async () => {
  await handleEncryption();
});

// Drag and drop for encryption
const encryptDropZone = document.getElementById('encrypt-drop-zone');
const encryptFileInput = document.getElementById('encrypt-file-input');

encryptDropZone.addEventListener('click', () => {
  encryptFileInput.click();
});

encryptDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  encryptDropZone.classList.add('drag-over');
});

encryptDropZone.addEventListener('dragleave', () => {
  encryptDropZone.classList.remove('drag-over');
});

encryptDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  encryptDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    handleEncryptFileSelect(file);
  }
});

function handleEncryptFileSelect(file) {
  if (!file) return;

  const validation = FileValidator.validateForEncryption(file);
  if (!validation.valid) {
    showStatus('encrypt-status', validation.error, 'error');
    return;
  }

  encryptFile = file;
  document.getElementById('encrypt-file-info').textContent = 
    `${file.name} (${FileValidator.formatFileSize(file.size)})`;
  document.getElementById('encrypt-btn').disabled = false;
  showStatus('encrypt-status', 'File ready for encryption', 'success');
}

async function handleEncryption() {
  if (!encryptFile) return;

  const usePassword = document.getElementById('use-password-encrypt').checked;
  const password = usePassword ? document.getElementById('encrypt-password').value : null;

  if (usePassword && !password) {
    showStatus('encrypt-status', 'Please enter a password', 'error');
    return;
  }

  try {
    document.getElementById('encrypt-btn').disabled = true;
    encryptProgressTracker.show();
    encryptProgressTracker.update(0, 'Preparing encryption...');
    showStatus('encrypt-status', 'Encrypting...', 'info');

    // Generate salt and IV
    const salt = KeyManager.generateSalt();
    const iv = KeyManager.generateIV();

    // Prepare encryption key
    const { key, keyData } = await Encryptor.prepareKey(password, salt);

    // Read and encrypt file in chunks
    const reader = new ChunkedFileReader(encryptFile);
    const encryptedChunks = [];
    let chunkIndex = 0;

    for await (const chunk of reader.readChunks()) {
      encryptProgressTracker.update(chunk.progress, `Encrypting chunk ${chunkIndex + 1}/${reader.getTotalChunks()}`);
      
      const encrypted = await Encryptor.encryptChunk(chunk.data, key, iv);
      encryptedChunks.push(new Uint8Array(encrypted));
      
      chunkIndex++;
    }

    // Create metadata
    const metadata = Encryptor.createMetadata(
      encryptFile.name,
      encryptFile.type || 'application/octet-stream',
      usePassword,
      encryptedChunks.length,
      keyData
    );

    encryptProgressTracker.update(95, 'Building encrypted file...');

    // Build final encrypted file
    const serializedMetadata = Encryptor.serializeMetadata(metadata);
    const encryptedBlob = Encryptor.buildEncryptedFile(salt, iv, encryptedChunks, serializedMetadata);

    encryptProgressTracker.complete('Encryption complete!');

    // Download encrypted file
    const encryptedFilename = Downloader.getEncryptedFilename(encryptFile.name);
    Downloader.download(encryptedBlob, encryptedFilename);

    showStatus('encrypt-status', `File encrypted successfully! Downloading ${encryptedFilename}`, 'success');

    // Reset
    setTimeout(() => {
      resetEncryptionForm();
    }, 2000);

  } catch (error) {
    console.error('Encryption error:', error);
    showStatus('encrypt-status', `Encryption failed: ${error.message}`, 'error');
    encryptProgressTracker.reset();
    document.getElementById('encrypt-btn').disabled = false;
  }
}

function resetEncryptionForm() {
  encryptFile = null;
  document.getElementById('encrypt-file-input').value = '';
  document.getElementById('encrypt-file-info').textContent = '';
  document.getElementById('encrypt-password').value = '';
  document.getElementById('use-password-encrypt').checked = false;
  document.getElementById('encrypt-password').disabled = true;
  document.getElementById('encrypt-btn').disabled = true;
  encryptProgressTracker.reset();
}

// ============= DECRYPTION HANDLERS =============

let currentDecryptedBlob = null;
let currentDecryptedFilename = null;

const decryptInputView = document.getElementById('decrypt-input-view');
const decryptMediaView = document.getElementById('decrypt-media-view');

function switchDecryptView(view) {
  if (view === 'media') {
    // Fade out input
    decryptInputView.classList.add('opacity-0', 'pointer-events-none');
    
    setTimeout(() => {
      decryptInputView.classList.add('hidden');
      decryptMediaView.classList.remove('hidden');
      
      // Trigger reflow
      void decryptMediaView.offsetWidth;
      
      // Fade in media
      decryptMediaView.classList.remove('opacity-0');
    }, 500); // Match transition duration
  } else {
    // Fade out media
    decryptMediaView.classList.add('opacity-0');
    
    setTimeout(() => {
      decryptMediaView.classList.add('hidden');
      decryptInputView.classList.remove('hidden');
      decryptInputView.classList.remove('pointer-events-none');
      
      // Trigger reflow
      void decryptInputView.offsetWidth;
      
      // Fade in input
      decryptInputView.classList.remove('opacity-0');
    }, 500);
  }
}

document.getElementById('media-back-btn').addEventListener('click', () => {
  switchDecryptView('input');
  setTimeout(() => {
    memoryManager.cleanup();
    imageViewer.clear();
    videoPlayer.clear();
    resetDecryptionForm();
  }, 500);
});

document.getElementById('media-download-btn').addEventListener('click', () => {
  if (currentDecryptedBlob && currentDecryptedFilename) {
    Downloader.download(currentDecryptedBlob, currentDecryptedFilename);
  }
});

function resetDecryptionForm() {
  decryptFile = null;
  document.getElementById('decrypt-file-input').value = '';
  document.getElementById('decrypt-file-info').textContent = '';
  document.getElementById('decrypt-password').value = '';
  document.getElementById('decrypt-password-group').style.display = 'none';
  document.getElementById('decrypt-btn').disabled = true;
  document.getElementById('decrypt-status').style.display = 'none';
  decryptProgressTracker.reset();
  currentDecryptedBlob = null;
  currentDecryptedFilename = null;
}

document.getElementById('decrypt-file-input').addEventListener('change', async (e) => {
  await handleDecryptFileSelect(e.target.files[0]);
});

document.getElementById('decrypt-btn').addEventListener('click', async () => {
  await handleDecryption();
});

// Drag and drop for decryption
const decryptDropZone = document.getElementById('decrypt-drop-zone');
const decryptFileInput = document.getElementById('decrypt-file-input');

decryptDropZone.addEventListener('click', () => {
  decryptFileInput.click();
});

decryptDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  decryptDropZone.classList.add('drag-over');
});

decryptDropZone.addEventListener('dragleave', () => {
  decryptDropZone.classList.remove('drag-over');
});

decryptDropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  decryptDropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    await handleDecryptFileSelect(file);
  }
});

async function handleDecryptFileSelect(file) {
  if (!file) return;

  const validation = FileValidator.validateForDecryption(file);
  if (!validation.valid) {
    showStatus('decrypt-status', validation.error, 'error');
    return;
  }

  decryptFile = file;
  document.getElementById('decrypt-file-info').textContent = 
    `${file.name} (${FileValidator.formatFileSize(file.size)})`;

  // Parse file to check if password is required
  try {
    showStatus('decrypt-status', 'Analyzing file...', 'info');
    const fileData = await file.arrayBuffer();
    const { metadata } = await Decryptor.parseEncryptedFile(fileData);

    const passwordGroup = document.getElementById('decrypt-password-group');
    if (metadata.hasPassword) {
      passwordGroup.style.display = 'block';
      document.getElementById('decrypt-password').value = '';
      showStatus('decrypt-status', 'File ready. Password required.', 'info');
    } else {
      passwordGroup.style.display = 'none';
      showStatus('decrypt-status', 'File ready for decryption (no password needed)', 'success');
    }

    document.getElementById('decrypt-btn').disabled = false;

  } catch (error) {
    showStatus('decrypt-status', `Invalid encrypted file: ${error.message}`, 'error');
    decryptFile = null;
  }
}

async function handleDecryption() {
  if (!decryptFile) return;

  const password = document.getElementById('decrypt-password').value || null;

  try {
    document.getElementById('decrypt-btn').disabled = true;
    decryptProgressTracker.show();
    decryptProgressTracker.update(0, 'Preparing decryption...');
    showStatus('decrypt-status', 'Decrypting...', 'info');

    // Clear previous media
    memoryManager.cleanup();
    imageViewer.clear();
    videoPlayer.clear();

    // Parse encrypted file
    decryptProgressTracker.update(5, 'Reading encrypted file...');
    const fileData = await decryptFile.arrayBuffer();
    const { salt, iv, encryptedData, metadata } = await Decryptor.parseEncryptedFile(fileData);

    // Prepare decryption key
    decryptProgressTracker.update(10, 'Preparing decryption key...');
    const key = await Decryptor.prepareKey(metadata, password, new Uint8Array(salt));

    // Decrypt data
    decryptProgressTracker.update(20, 'Decrypting data...');
    const decryptedData = await Decryptor.decryptChunk(encryptedData, key, new Uint8Array(iv));

    decryptProgressTracker.update(90, 'Building decrypted file...');

    // Create blob from decrypted data
    const decryptedBlob = new Blob([decryptedData], { type: metadata.mimeType });
    const filename = metadata.filename;

    decryptProgressTracker.complete('Decryption complete!');

    // Store for download
    currentDecryptedBlob = decryptedBlob;
    currentDecryptedFilename = Downloader.getDecryptedFilename(decryptFile.name, filename);

    // Check if it's a media file
    const mediaType = Decryptor.detectMediaType(metadata.mimeType);

    if (mediaType.isImage) {
      // Display image
      const blobUrl = imageViewer.display(decryptedBlob, filename);
      memoryManager.activeBlobUrls.add(blobUrl);
      switchDecryptView('media');
    } else if (mediaType.isVideo) {
      // Display video player
      const blobUrl = videoPlayer.display(decryptedBlob, filename);
      memoryManager.activeBlobUrls.add(blobUrl);
      switchDecryptView('media');
    } else {
      // Download non-media files
      Downloader.download(decryptedBlob, currentDecryptedFilename);
      showStatus('decrypt-status', `File decrypted successfully! Downloading ${currentDecryptedFilename}`, 'success');
      
      // Reset after delay
      setTimeout(() => {
        resetDecryptionForm();
      }, 3000);
    }

  } catch (error) {
    console.error('Decryption error:', error);
    showStatus('decrypt-status', `Decryption failed: ${error.message}`, 'error');
    decryptProgressTracker.reset();
    document.getElementById('decrypt-btn').disabled = false;
  }
}

// ============= STEGANOGRAPHY HANDLERS =============

// Stego Mode Switching
const stegoModeHide = document.getElementById('stego-mode-hide');
const stegoModeReveal = document.getElementById('stego-mode-reveal');
const stegoViewHide = document.getElementById('stego-view-hide');
const stegoViewReveal = document.getElementById('stego-view-reveal');

function switchStegoMode(mode) {
  if (mode === 'hide') {
    stegoModeHide.classList.add('text-primary', 'border-primary');
    stegoModeHide.classList.remove('text-muted-foreground', 'border-transparent');
    stegoModeReveal.classList.add('text-muted-foreground', 'border-transparent');
    stegoModeReveal.classList.remove('text-primary', 'border-primary');
    
    stegoViewHide.classList.remove('hidden');
    stegoViewReveal.classList.add('hidden');
  } else {
    stegoModeReveal.classList.add('text-primary', 'border-primary');
    stegoModeReveal.classList.remove('text-muted-foreground', 'border-transparent');
    stegoModeHide.classList.add('text-muted-foreground', 'border-transparent');
    stegoModeHide.classList.remove('text-primary', 'border-primary');
    
    stegoViewReveal.classList.remove('hidden');
    stegoViewHide.classList.add('hidden');
  }
}

stegoModeHide.addEventListener('click', () => switchStegoMode('hide'));
stegoModeReveal.addEventListener('click', () => switchStegoMode('reveal'));

// Stego Variables
let stegoCoverFile = null;
let stegoSecretFile = null;
let stegoRevealFile = null;
let stegoMaxBytes = 0;

// --- HIDE LOGIC ---

// Toggle File/Text Mode
const stegoTypeRadios = document.getElementsByName('stego-type');
const stegoSecretTextContainer = document.getElementById('stego-secret-text-container');
const stegoSecretTextInput = document.getElementById('stego-secret-text');

stegoTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'text') {
      stegoSecretDropZone.classList.add('hidden');
      stegoSecretTextContainer.classList.remove('hidden');
      // Enable button if text is present
      if (stegoSecretTextInput.value.length > 0) {
        document.getElementById('stego-hide-btn').disabled = false;
      }
    } else {
      stegoSecretDropZone.classList.remove('hidden');
      stegoSecretTextContainer.classList.add('hidden');
      // Re-evaluate button state based on file
      document.getElementById('stego-hide-btn').disabled = !stegoSecretFile;
    }
    updateCapacityBar();
  });
});

// Text Input Handler
stegoSecretTextInput.addEventListener('input', (e) => {
  const text = e.target.value;
  const size = new Blob([text]).size; // Get byte size
  
  document.getElementById('stego-text-chars').textContent = `${text.length} chars`;
  
  if (stegoMaxBytes > 0) {
    const estimatedSize = size + 1024; // Overhead
    if (estimatedSize > stegoMaxBytes) {
      showStatus('stego-hide-status', 'Text too long for this image!', 'error');
      document.getElementById('stego-hide-btn').disabled = true;
    } else {
      showStatus('stego-hide-status', '', 'info');
      document.getElementById('stego-hide-btn').disabled = false;
    }
    updateCapacityBar(estimatedSize, stegoMaxBytes);
  }
});

// Cover Image Drop Zone
const stegoCoverDropZone = document.getElementById('stego-cover-drop-zone');
const stegoCoverInput = document.getElementById('stego-cover-input');

stegoCoverDropZone.addEventListener('click', () => stegoCoverInput.click());
stegoCoverDropZone.addEventListener('dragover', (e) => { e.preventDefault(); stegoCoverDropZone.classList.add('drag-over'); });
stegoCoverDropZone.addEventListener('dragleave', () => stegoCoverDropZone.classList.remove('drag-over'));
stegoCoverDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  stegoCoverDropZone.classList.remove('drag-over');
  handleStegoCoverSelect(e.dataTransfer.files[0]);
});
stegoCoverInput.addEventListener('change', (e) => handleStegoCoverSelect(e.target.files[0]));

async function handleStegoCoverSelect(file) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('stego-hide-status', 'Please select a valid image file.', 'error');
    return;
  }

  stegoCoverFile = file;
  document.getElementById('stego-cover-info').textContent = file.name;
  
  // Calculate Capacity
  const img = await LSBEncoder.loadImage(file);
  stegoMaxBytes = LSBEncoder.getMaxCapacity(img);
  
  // Update UI with Max Size
  const maxSizeDisplay = document.getElementById('stego-max-size-display');
  maxSizeDisplay.classList.remove('hidden');
  maxSizeDisplay.querySelector('span').textContent = FileValidator.formatFileSize(stegoMaxBytes);
  
  document.getElementById('stego-text-max').textContent = `Max: ~${Math.floor(stegoMaxBytes / 2)} chars`; // Rough estimate for text

  // Enable secret inputs
  const secretZone = document.getElementById('stego-secret-drop-zone');
  secretZone.classList.remove('opacity-50', 'pointer-events-none');
  secretZone.dataset.enabled = 'true';
  
  // Reset secret file if new cover is selected
  stegoSecretFile = null;
  document.getElementById('stego-secret-info').textContent = '';
  document.getElementById('stego-hide-btn').disabled = true;
  updateCapacityBar();
}

// Secret File Drop Zone
const stegoSecretDropZone = document.getElementById('stego-secret-drop-zone');
const stegoSecretInput = document.getElementById('stego-secret-input');

stegoSecretDropZone.addEventListener('click', () => {
  // Always allow click if enabled, logic handled in change event
  if (stegoSecretDropZone.dataset.enabled === 'true') stegoSecretInput.click();
});
stegoSecretDropZone.addEventListener('dragover', (e) => { e.preventDefault(); if(stegoSecretDropZone.dataset.enabled === 'true') stegoSecretDropZone.classList.add('drag-over'); });
stegoSecretDropZone.addEventListener('dragleave', () => stegoSecretDropZone.classList.remove('drag-over'));
stegoSecretDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  stegoSecretDropZone.classList.remove('drag-over');
  if (stegoSecretDropZone.dataset.enabled === 'true') handleStegoSecretSelect(e.dataTransfer.files[0]);
});
stegoSecretInput.addEventListener('change', (e) => handleStegoSecretSelect(e.target.files[0]));

async function handleStegoSecretSelect(file) {
  if (!file) return;
  
  // Estimate encrypted size (file size + overhead)
  const estimatedSize = file.size + 1024; // generous overhead estimate
  
  if (estimatedSize > stegoMaxBytes) {
    showStatus('stego-hide-status', `File too large! Max capacity: ${FileValidator.formatFileSize(stegoMaxBytes)}`, 'error');
    return;
  }

  stegoSecretFile = file;
  document.getElementById('stego-secret-info').textContent = file.name;
  document.getElementById('stego-hide-btn').disabled = false;
  showStatus('stego-hide-status', '', 'info'); // Clear error
  
  updateCapacityBar(estimatedSize, stegoMaxBytes);
}

function updateCapacityBar(used = 0, total = 1) {
  const container = document.getElementById('stego-capacity-container');
  const bar = document.getElementById('stego-capacity-bar');
  const text = document.getElementById('stego-capacity-text');
  
  if (used === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  const percentage = Math.min(100, (used / total) * 100);
  bar.style.width = `${percentage}%`;
  text.textContent = `${percentage.toFixed(1)}%`;
  
  if (percentage > 90) bar.className = 'h-full bg-red-500 transition-all duration-300';
  else if (percentage > 70) bar.className = 'h-full bg-yellow-500 transition-all duration-300';
  else bar.className = 'h-full bg-green-500 transition-all duration-300';
}

// Password Toggle
document.getElementById('stego-use-password').addEventListener('change', (e) => {
  const container = document.getElementById('stego-password-container');
  if (e.target.checked) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
    document.getElementById('stego-password').value = '';
  }
});

// Hide Button
document.getElementById('stego-hide-btn').addEventListener('click', async () => {
  if (!stegoCoverFile) return;
  
  const mode = document.querySelector('input[name="stego-type"]:checked').value;
  let dataToEncrypt = null;
  let filename = 'secret.txt';
  let mimeType = 'text/plain';

  if (mode === 'file') {
    if (!stegoSecretFile) return;
    dataToEncrypt = await stegoSecretFile.arrayBuffer();
    filename = stegoSecretFile.name;
    mimeType = stegoSecretFile.type || 'application/octet-stream';
  } else {
    const text = document.getElementById('stego-secret-text').value;
    if (!text) return;
    dataToEncrypt = new TextEncoder().encode(text);
  }
  
  try {
    document.getElementById('stego-hide-btn').disabled = true;
    showStatus('stego-hide-status', 'Processing...', 'info');
    
    // 1. Encrypt Secret Data
    const usePassword = document.getElementById('stego-use-password').checked;
    const password = usePassword ? document.getElementById('stego-password').value : null;
    
    if (usePassword && !password) {
      showStatus('stego-hide-status', 'Please enter a password.', 'error');
      document.getElementById('stego-hide-btn').disabled = false;
      return;
    }

    // Generate keys
    const salt = KeyManager.generateSalt();
    const iv = KeyManager.generateIV();
    const { key, keyData } = await Encryptor.prepareKey(password, salt);
    
    // Encrypt
    const encryptedData = await Encryptor.encryptChunk(dataToEncrypt, key, iv);
    
    // Create metadata
    const metadata = Encryptor.createMetadata(
      filename,
      mimeType,
      usePassword,
      1, // Single chunk
      keyData
    );
    
    // Build .enc structure in memory
    const serializedMetadata = Encryptor.serializeMetadata(metadata);
    const encryptedBlob = Encryptor.buildEncryptedFile(salt, iv, [new Uint8Array(encryptedData)], serializedMetadata);
    const encryptedBuffer = new Uint8Array(await encryptedBlob.arrayBuffer());
    
    // 2. Hide in Image
    showStatus('stego-hide-status', 'Embedding data into image...', 'info');
    const stegoBlob = await LSBEncoder.hide(stegoCoverFile, encryptedBuffer);
    
    // 3. Download
    Downloader.download(stegoBlob, `stego_${stegoCoverFile.name.split('.')[0]}.png`);
    showStatus('stego-hide-status', 'Success! Image downloaded.', 'success');
    
    // Reset
    setTimeout(() => {
      stegoSecretFile = null;
      document.getElementById('stego-secret-info').textContent = '';
      document.getElementById('stego-secret-text').value = '';
      document.getElementById('stego-hide-btn').disabled = true;
      updateCapacityBar();
      showStatus('stego-hide-status', '', 'info');
    }, 3000);

  } catch (error) {
    console.error(error);
    showStatus('stego-hide-status', `Error: ${error.message}`, 'error');
    document.getElementById('stego-hide-btn').disabled = false;
  }
});

// --- REVEAL LOGIC ---

const stegoRevealDropZone = document.getElementById('stego-reveal-drop-zone');
const stegoRevealInput = document.getElementById('stego-reveal-input');

stegoRevealDropZone.addEventListener('click', () => stegoRevealInput.click());
stegoRevealDropZone.addEventListener('dragover', (e) => { e.preventDefault(); stegoRevealDropZone.classList.add('drag-over'); });
stegoRevealDropZone.addEventListener('dragleave', () => stegoRevealDropZone.classList.remove('drag-over'));
stegoRevealDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  stegoRevealDropZone.classList.remove('drag-over');
  handleStegoRevealSelect(e.dataTransfer.files[0]);
});
stegoRevealInput.addEventListener('change', (e) => handleStegoRevealSelect(e.target.files[0]));

function handleStegoRevealSelect(file) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('stego-reveal-status', 'Please select a valid image file.', 'error');
    return;
  }
  
  stegoRevealFile = file;
  document.getElementById('stego-reveal-info').textContent = file.name;
  document.getElementById('stego-reveal-btn').disabled = false;
  document.getElementById('stego-reveal-password-group').classList.remove('hidden'); // Always show password input just in case
  showStatus('stego-reveal-status', 'Ready to reveal.', 'info');
}

document.getElementById('stego-reveal-btn').addEventListener('click', async () => {
  if (!stegoRevealFile) return;
  
  try {
    document.getElementById('stego-reveal-btn').disabled = true;
    showStatus('stego-reveal-status', 'Extracting data...', 'info');
    
    // 1. Extract Data
    const extractedBuffer = await LSBEncoder.reveal(stegoRevealFile);
    
    // 2. Parse as Encrypted File
    showStatus('stego-reveal-status', 'Decrypting...', 'info');
    const { salt, iv, encryptedData, metadata } = await Decryptor.parseEncryptedFile(extractedBuffer.buffer);
    
    // 3. Decrypt
    const password = document.getElementById('stego-reveal-password').value || null;
    
    if (metadata.hasPassword && !password) {
      throw new Error('Password required to decrypt hidden file.');
    }
    
    const key = await Decryptor.prepareKey(metadata, password, new Uint8Array(salt));
    const decryptedData = await Decryptor.decryptChunk(encryptedData, key, new Uint8Array(iv));
    
    // 4. Download
    const blob = new Blob([decryptedData], { type: metadata.mimeType });
    Downloader.download(blob, metadata.filename);
    
    showStatus('stego-reveal-status', `Success! Revealed ${metadata.filename}`, 'success');
    
    setTimeout(() => {
      stegoRevealFile = null;
      document.getElementById('stego-reveal-info').textContent = '';
      document.getElementById('stego-reveal-password').value = '';
      document.getElementById('stego-reveal-btn').disabled = true;
      showStatus('stego-reveal-status', '', 'info');
    }, 3000);

  } catch (error) {
    console.error(error);
    showStatus('stego-reveal-status', `Failed: ${error.message}`, 'error');
    document.getElementById('stego-reveal-btn').disabled = false;
  }
});

// ============= UTILITY FUNCTIONS =============
