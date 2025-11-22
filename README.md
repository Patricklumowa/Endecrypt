# Endecrypt

**Endecrypt** is a secure, client-side file encryption and steganography tool built with modern web technologies. It allows users to encrypt files, decrypt them, and hide sensitive data within images using Least Significant Bit (LSB) steganography, all directly in the browser without sending data to a server.

![Endecrypt UI](https://via.placeholder.com/800x450?text=Endecrypt+UI+Preview)

## ✨ Features

*   **🔒 Secure Encryption**: Uses robust AES-GCM encryption for file security.
*   **⚡ Client-Side Processing**: All operations happen locally in your browser. Your files never leave your device.
*   **🖼️ Steganography**: Hide files or text messages inside PNG images using LSB encoding.
*   **📂 Large File Support**: Efficient chunked processing allows handling large files without freezing the browser.
*   **🎨 Modern UI**: Beautiful Glassmorphism interface built with Tailwind CSS.
*   **🚀 High Performance**: Utilizes Web Workers to keep the UI responsive during heavy cryptographic operations.

## 🛠️ Tech Stack

*   **Core**: Vanilla JavaScript (ES Modules)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Crypto**: Web Crypto API
*   **Icons**: Lucide

## 🚀 Getting Started

### Prerequisites

*   Node.js (v16 or higher)
*   npm (v7 or higher)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Patricklumowa/Endecrypt.git
    cd Endecrypt
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173`.

## 📖 Usage

### Encryption
1.  Navigate to the **Encrypt** tab.
2.  Drag and drop a file or click to select one.
3.  (Optional) Enable password protection and enter a strong password.
4.  Click **Encrypt File**. The encrypted file (`.enc`) will download automatically.

### Decryption
1.  Navigate to the **Decrypt** tab.
2.  Upload an `.enc` file.
3.  If the file is password-protected, enter the password.
4.  Click **Decrypt File** to retrieve the original file.

### Steganography (Hide Data)
1.  Navigate to the **Stego** tab.
2.  Upload a **Cover Image** (must be an image file).
3.  Choose to hide a **File** or **Text**.
4.  Upload the secret file or type your message.
5.  Click **Hide & Download PNG**.

### Steganography (Reveal Data)
1.  Go to the **Stego** tab and select **Reveal Data**.
2.  Upload the Steganographic image (PNG).
3.  Enter the password if one was used.
4.  Click **Reveal & Download** to extract the hidden data.

## 🛡️ Security Note

Endecrypt performs all encryption and decryption locally using the Web Crypto API. However, for critical security needs, always ensure your environment is secure and free from malware/keyloggers.

## 📄 License

This project is open source.
