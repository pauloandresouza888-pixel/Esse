# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Expo CLI
npm install -g expo-cli

# Criar projeto
npx create-expo-app eduai-video --template blank
cd eduai-video

# Instalar dependências
npm install expo-router lucide-react-native react-native-reanimated expo-linear-gradient expo-av expo-document-picker expo-image-picker expo-blur zustand @tanstack/react-query

# Copiar os arquivos do ZIP para as pastas corretas
# (use o editor de arquivos do Codespace)

# Iniciar
npx expo start --tunnel
