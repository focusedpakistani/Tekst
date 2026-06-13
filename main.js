const SUPABASE_URL = "https://ahxfvnxcefeagexopati.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeGZ2bnhjZWZlYWdleG9wYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjI2NzMsImV4cCI6MjA5NjczODY3M30.JJBhO7kGW_3lQotCqhYD6q4NWTKtrdTGAtb6Z0-GdQs"
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- STATE ---
const state = {
  user: null,
  messages: [],
  isLoading: false,
  error: '',
  showEmojiPicker: false,
  replyTo: null,
  editingMessage: null,
  burnoutSetting: null, // null, 30, 60, 300
  searchQuery: '',
  typingUsers: new Set()
}

const appElement = document.getElementById('app')

// Configure marked to linkify URLs
marked.setOptions({
  gfm: true,
  breaks: true,
})

// --- AUDIO HELPER ---
let audioCtx = null
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    osc.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    if (type === 'send') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.1)
    } else if (type === 'receive') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(800, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15)
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.15)
    }
  } catch (e) {}
}

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// --- RENDERERS ---
function renderLogin() {
  appElement.innerHTML = `
    <div class="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in duration-500">
      <div class="text-center space-y-2">
        <h1 class="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-brand to-lime-brand drop-shadow-sm uppercase">
          Tekst
        </h1>
        <p class="text-zinc-400 text-sm font-medium tracking-wide uppercase">Vanilla JS Edition</p>
      </div>

      <form id="loginForm" class="w-full max-w-sm space-y-4">
        <div>
          <input type="text" id="usernameInput" placeholder="Username" class="w-full p-4 bg-zinc-900 border-2 border-zinc-800 rounded-xl focus:border-purple-brand focus:ring-0 outline-none text-zinc-100 placeholder-zinc-500 font-medium transition" required />
        </div>
        <div>
          <input type="password" id="passwordInput" placeholder="Password" class="w-full p-4 bg-zinc-900 border-2 border-zinc-800 rounded-xl focus:border-purple-brand focus:ring-0 outline-none text-zinc-100 placeholder-zinc-500 font-medium transition" required />
        </div>
        <div id="errorDisplay" class="text-red-400 text-sm font-bold h-5 text-center"></div>
        <button type="submit" id="loginBtn" class="w-full py-4 rounded-xl bg-purple-brand text-white font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50">
          Enter Tekst
        </button>
      </form>
    </div>
  `
  document.getElementById('loginForm').addEventListener('submit', handleLogin)
}

function renderChat() {
  appElement.innerHTML = `
    <!-- Fullscreen Lightbox -->
    <div id="lightbox" class="hidden absolute inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer">
      <img id="lightboxImg" src="" class="max-w-[95%] max-h-[95%] object-contain rounded-xl shadow-2xl" />
      <button class="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-white/20 transition">
        <i data-lucide="x" class="w-6 h-6"></i>
      </button>
    </div>

    <!-- Context Menu Overlay -->
    <div id="contextMenuOverlay" class="hidden absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity">
      <div id="contextMenu" class="context-menu absolute bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-900 rounded-xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-w-[150px]">
        <!-- Populated by JS -->
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settingsModal" class="hidden absolute inset-0 z-[110] bg-zinc-50/90 dark:bg-zinc-950/90 flex flex-col p-6 animate-in slide-in-from-bottom-full">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-black uppercase text-zinc-900 dark:text-zinc-100">Settings</h2>
        <button id="closeSettingsBtn" class="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
          <i data-lucide="x" class="w-6 h-6"></i>
        </button>
      </div>
      
      <div class="space-y-6 flex-1">
        <div class="space-y-2">
          <label class="text-sm font-bold uppercase text-zinc-500">Typography Font</label>
          <select id="fontSelect" class="w-full p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-900 rounded-xl outline-none text-zinc-900 dark:text-zinc-100 font-medium">
            <option value="system-ui">System Default</option>
            <option value="Quicksand">Quicksand</option>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
          </select>
        </div>
        
        <div class="space-y-2">
          <label class="text-sm font-bold uppercase text-zinc-500">Accent Colors</label>
          <div class="flex gap-4">
            <input type="color" id="colorLime" value="#DDFFB2" class="w-12 h-12 rounded cursor-pointer" title="Primary Accent" />
            <input type="color" id="colorPurple" value="#55056D" class="w-12 h-12 rounded cursor-pointer" title="Secondary Accent" />
            <button id="applyColorsBtn" class="px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold uppercase text-sm">Apply</button>
          </div>
        </div>
      </div>

      <button id="logoutBtn" class="w-full py-4 rounded-xl bg-red-500 text-white font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
        Log Out
      </button>
    </div>

    <!-- Header -->
    <header class="p-4 bg-white dark:bg-zinc-950 flex flex-col border-b border-zinc-200 dark:border-zinc-800 z-20 shadow-sm relative">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full border-2 border-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
            <img src="${state.user.avatar_url}" alt="avatar" class="w-full h-full object-cover" />
          </div>
          <div>
            <h1 class="text-xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase">Tekst</h1>
            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <div class="w-2 h-2 rounded-full bg-lime-brand animate-pulse"></div>
              <span>Online</span>
            </span>
          </div>
        </div>
        <div class="flex gap-1">
          <button id="toggleSearchBtn" class="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition text-zinc-600 dark:text-zinc-400">
            <i data-lucide="search" class="w-5 h-5"></i>
          </button>
          <button id="openSettingsBtn" class="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition text-zinc-600 dark:text-zinc-400">
            <i data-lucide="settings" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
      
      <!-- Search Bar -->
      <div id="searchBarWrapper" class="w-full">
        <div class="mt-3 relative">
          <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"></i>
          <input type="text" id="searchInput" placeholder="Search messages..." class="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none text-sm text-zinc-900 dark:text-zinc-100" />
        </div>
      </div>
    </header>

    <!-- Pinned Banner -->
    <div id="pinnedBanner" class="bg-purple-brand/10 border-b border-purple-brand/20 p-3 flex items-center gap-3 relative cursor-pointer hover:bg-purple-brand/20 transition">
      <i data-lucide="pin" class="w-4 h-4 text-purple-brand flex-shrink-0"></i>
      <div class="flex-1 truncate text-sm font-medium text-purple-brand dark:text-purple-300" id="pinnedBannerText">No pinned messages.</div>
      <button id="closePinBtn" class="text-purple-brand/50 hover:text-purple-brand p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>

    <!-- Messages -->
    <main id="messagesContainer" class="flex-1 overflow-y-auto w-full no-scrollbar flex flex-col p-4 space-y-4 relative bg-zinc-50 dark:bg-zinc-950 pb-10">
      <div class="text-center text-zinc-500 text-xs py-10 font-bold uppercase tracking-wider">Welcome to the void.</div>
    </main>

    <!-- Floating Scroll To Bottom Button -->
    <button id="scrollToBottomBtn" class="absolute bottom-[140px] right-4 w-10 h-10 bg-purple-brand text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-10">
      <i data-lucide="chevron-down" class="w-5 h-5"></i>
    </button>

    <!-- Typing Indicator Overlay -->
    <div id="typingIndicator" class="absolute bottom-[125px] left-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-4 py-2 shadow-sm text-xs text-zinc-500 font-medium flex items-center gap-2 hidden z-10 transition-opacity">
      <div class="flex gap-1">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>
      <span id="typingText">Someone is typing...</span>
    </div>

    <!-- Composer -->
    <footer class="p-3 bg-white dark:bg-zinc-900 border-t-2 border-zinc-900 relative z-20">
      <div id="replyPreviewWrapper" class="hidden absolute bottom-full left-0 right-0 bg-zinc-100 dark:bg-zinc-800 p-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center text-xs">
        <div class="flex flex-col truncate pr-4">
          <span class="font-bold text-purple-brand" id="replyPreviewUser"></span>
          <span class="text-zinc-600 dark:text-zinc-400 truncate" id="replyPreviewText"></span>
        </div>
        <button id="cancelReplyBtn" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">✕</button>
      </div>

      <div id="emojiPickerWrapper" class="hidden absolute bottom-20 right-4 z-50 rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-800">
        <emoji-picker class="dark"></emoji-picker>
      </div>

      <form id="composeForm" class="flex flex-col gap-2 relative">
        <div class="flex gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <select id="burnoutSelect" class="bg-transparent outline-none cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100">
            <option value="">🔥 Burnout: Off</option>
            <option value="30">🔥 Burnout: 30s</option>
            <option value="60">🔥 Burnout: 60s</option>
            <option value="300">🔥 Burnout: 5m</option>
          </select>
        </div>

        <div class="flex items-end gap-2">
          <button type="button" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all relative overflow-hidden">
            <i data-lucide="paperclip" class="w-5 h-5"></i>
            <input type="file" id="mediaInput" accept="image/*,video/*,application/pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </button>

          <button type="button" id="emojiToggleBtn" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all">
            <i data-lucide="smile" class="w-5 h-5"></i>
          </button>
          
          <div class="flex-1 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 rounded-xl flex items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5 transition-all overflow-hidden relative">
            <textarea 
              id="messageInput"
              class="w-full bg-transparent text-zinc-900 dark:text-zinc-100 p-3 outline-none resize-none no-scrollbar font-medium placeholder-zinc-400 min-h-[48px] max-h-[120px]" 
              placeholder="Type a message..." 
              rows="1"
            ></textarea>
            <div id="recordingWaves" class="hidden absolute inset-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <div class="recording-waves">
                <div class="wave"></div><div class="wave"></div><div class="wave"></div><div class="wave"></div><div class="wave"></div>
              </div>
              <span class="ml-3 text-red-500 font-bold animate-pulse text-sm">Recording...</span>
            </div>
          </div>
          
          <button type="button" id="micBtn" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all select-none">
            <i data-lucide="mic" class="w-5 h-5"></i>
          </button>

          <button type="submit" id="sendBtn" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-purple-brand text-white border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-purple-600 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all">
            <i data-lucide="send" id="sendIcon" class="w-5 h-5"></i>
          </button>
        </div>
      </form>
    </footer>
  `

  lucide.createIcons()

  // Lightbox Logic
  const lightbox = document.getElementById('lightbox')
  const lightboxImg = document.getElementById('lightboxImg')
  lightbox.addEventListener('click', () => lightbox.classList.add('hidden'))
  window.openLightbox = (url) => {
    lightboxImg.src = url
    lightbox.classList.remove('hidden')
  }

  // Scroll to Bottom Logic
  const messagesContainer = document.getElementById('messagesContainer')
  const scrollToBottomBtn = document.getElementById('scrollToBottomBtn')
  messagesContainer.addEventListener('scroll', () => {
    const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100
    if (isAtBottom) {
      scrollToBottomBtn.classList.remove('visible')
    } else {
      scrollToBottomBtn.classList.add('visible')
    }
  })
  scrollToBottomBtn.addEventListener('click', () => {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' })
  })

  // Search Logic
  const searchBarWrapper = document.getElementById('searchBarWrapper')
  document.getElementById('toggleSearchBtn').addEventListener('click', () => {
    searchBarWrapper.classList.toggle('open')
    if(searchBarWrapper.classList.contains('open')) document.getElementById('searchInput').focus()
    else { state.searchQuery = ''; document.getElementById('searchInput').value = ''; renderMessages(); }
  })
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase()
    renderMessages()
  })

  // Settings Logic
  document.getElementById('openSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('hidden')
  })
  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden')
  })
  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.user = null
    localStorage.removeItem('tekst_user')
    renderLogin()
  })
  document.getElementById('fontSelect').addEventListener('change', (e) => {
    const val = e.target.value
    if(val === 'system-ui') {
      document.body.style.fontFamily = ''
      document.getElementById('dynamic-font').href = ''
    } else {
      document.getElementById('dynamic-font').href = `https://fonts.googleapis.com/css2?family=${val}:wght@300..700&display=swap`
      document.body.style.fontFamily = `"${val}", sans-serif`
    }
  })
  document.getElementById('applyColorsBtn').addEventListener('click', () => {
    const root = document.documentElement
    root.style.setProperty('--accent-color', document.getElementById('colorLime').value)
    root.style.setProperty('--accent-text', document.getElementById('colorPurple').value)
  })

  // Burnout & Emoji
  document.getElementById('burnoutSelect').addEventListener('change', (e) => {
    state.burnoutSetting = e.target.value ? parseInt(e.target.value) : null
  })
  const composeForm = document.getElementById('composeForm')
  const messageInput = document.getElementById('messageInput')
  const emojiToggleBtn = document.getElementById('emojiToggleBtn')
  const emojiPickerWrapper = document.getElementById('emojiPickerWrapper')
  const cancelReplyBtn = document.getElementById('cancelReplyBtn')
  const contextMenuOverlay = document.getElementById('contextMenuOverlay')

  contextMenuOverlay.addEventListener('click', () => {
    contextMenuOverlay.classList.add('hidden')
  })

  cancelReplyBtn.addEventListener('click', () => {
    state.replyTo = null
    state.editingMessage = null
    document.getElementById('replyPreviewWrapper').classList.add('hidden')
    document.getElementById('sendIcon').setAttribute('data-lucide', 'send')
    lucide.createIcons()
    messageInput.value = ''
  })

  emojiToggleBtn.addEventListener('click', () => {
    state.showEmojiPicker = !state.showEmojiPicker
    emojiPickerWrapper.classList.toggle('hidden', !state.showEmojiPicker)
  })

  document.querySelector('emoji-picker').addEventListener('emoji-click', event => {
    messageInput.value += event.detail.unicode
    state.showEmojiPicker = false
    emojiPickerWrapper.classList.add('hidden')
    messageInput.focus()
  })

  // Typing Presence
  let typingTimeout = null
  messageInput.addEventListener('input', function() {
    this.style.height = '48px'
    this.style.height = (this.scrollHeight) + 'px'
    
    if (presenceChannel) {
      presenceChannel.track({ user: state.user.username, typing: true })
      clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => {
        presenceChannel.track({ user: state.user.username, typing: false })
      }, 2000)
    }
  })

  composeForm.addEventListener('submit', handleSendMessage)
  
  const mediaInput = document.getElementById('mediaInput')
  if(mediaInput) {
    mediaInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      let type = 'image'
      if(file.type.startsWith('video/')) type = 'video'
      if(file.type === 'application/pdf') type = 'pdf'
      uploadMedia(file, type)
    })
  }

  // Voice Recording
  let mediaRecorder;
  let audioChunks = [];
  const micBtn = document.getElementById('micBtn')
  const recordingWaves = document.getElementById('recordingWaves')
  
  if(micBtn) {
    micBtn.addEventListener('mousedown', startRecording)
    micBtn.addEventListener('touchstart', startRecording, { passive: false })
    micBtn.addEventListener('mouseup', stopRecording)
    micBtn.addEventListener('touchend', stopRecording)
  }

  async function startRecording(e) {
    e.preventDefault()
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder = new MediaRecorder(stream)
        audioChunks = []
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data)
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
          const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
          uploadMedia(file, 'voice')
        }
        mediaRecorder.start()
        micBtn.classList.add('text-red-500')
        micBtn.classList.remove('text-zinc-600', 'dark:text-zinc-400')
        recordingWaves.classList.remove('hidden')
      } catch (err) {
        console.error('Mic error:', err)
      }
    }
  }

  function stopRecording(e) {
    e.preventDefault()
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      micBtn.classList.remove('text-red-500')
      micBtn.classList.add('text-zinc-600', 'dark:text-zinc-400')
      recordingWaves.classList.add('hidden')
    }
  }
  
  fetchMessages()
  setupRealtime()
  setupPresence()
}

// --- LOGIC ---
async function handleLogin(e) {
  e.preventDefault()
  if (state.isLoading) return

  const username = document.getElementById('usernameInput').value.trim()
  const password = document.getElementById('passwordInput').value.trim()
  const errorDisplay = document.getElementById('errorDisplay')
  const loginBtn = document.getElementById('loginBtn')

  if (!username || !password) return

  state.isLoading = true
  loginBtn.textContent = 'Connecting...'
  errorDisplay.textContent = ''

  try {
    const { data, error } = await supabaseClient.from('users').select('*').eq('username', username).maybeSingle()
    if (error) throw error
    if (data && data.password === password) {
      state.user = data
      localStorage.setItem('tekst_user', JSON.stringify(data))
      renderChat()
    } else {
      errorDisplay.textContent = 'User not found or incorrect password.'
    }
  } catch (err) {
    errorDisplay.textContent = 'Database error.'
  } finally {
    state.isLoading = false
    if (!state.user) loginBtn.textContent = 'Enter Tekst'
  }
}

async function fetchMessages() {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*, users!messages_sender_id_fkey(username, avatar_url)')
    .order('created_at', { ascending: true })
    .limit(150)

  if (error) alert(`Fetch failed: ${error.message}`)

  if (!error && data) {
    state.messages = data
    renderMessages()
  }
}

async function uploadMedia(file, type) {
  state.isLoading = true
  const fileExt = file.name.split('.').pop() || 'webm'
  const fileName = `${state.user.id}-${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  try {
    const { error: uploadError } = await supabaseClient.storage.from('chat_media').upload(filePath, file)
    if (uploadError) throw uploadError
    
    const { data: publicUrlData } = supabaseClient.storage.from('chat_media').getPublicUrl(filePath)
    const mediaUrl = publicUrlData.publicUrl

    const replyId = state.replyTo ? state.replyTo.id : null
    state.replyTo = null
    document.getElementById('replyPreviewWrapper').classList.add('hidden')

    await supabaseClient.from('messages').insert([{
      sender_id: state.user.id,
      message_type: type,
      media_url: mediaUrl,
      reply_to_id: replyId,
      burn_after_seconds: state.burnoutSetting
    }])
  } catch(err) {
    alert(`Upload failed: ${err.message}`)
  } finally {
    state.isLoading = false
  }
}

let realtimeChannel = null
let presenceChannel = null

function setupRealtime() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel)
  realtimeChannel = supabaseClient.channel('public:messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        const { data: userData } = await supabaseClient.from('users').select('username, avatar_url').eq('id', payload.new.sender_id).single()
        if (userData) {
          const newMsg = { ...payload.new, users: userData }
          // If inserting a record we optimistically inserted, dedup
          const existingIdx = state.messages.findIndex(m => m.text_content === newMsg.text_content && m.is_pending)
          if(existingIdx !== -1) {
            state.messages[existingIdx] = newMsg
          } else {
            state.messages.push(newMsg)
          }
          renderMessages()
          if (newMsg.sender_id !== state.user.id) playSound('receive')
        }
      } else if (payload.eventType === 'UPDATE') {
        const idx = state.messages.findIndex(m => m.id === payload.new.id)
        if (idx !== -1) {
          state.messages[idx] = { ...state.messages[idx], ...payload.new }
          renderMessages()
        }
      }
    })
    .subscribe()
}

function setupPresence() {
  presenceChannel = supabaseClient.channel('room_presence')
  presenceChannel.on('presence', { event: 'sync' }, () => {
    const stateObj = presenceChannel.presenceState()
    state.typingUsers.clear()
    for (const id in stateObj) {
      if(stateObj[id][0].typing && stateObj[id][0].user !== state.user.username) {
        state.typingUsers.add(stateObj[id][0].user)
      }
    }
    const indicator = document.getElementById('typingIndicator')
    if(state.typingUsers.size > 0) {
      document.getElementById('typingText').textContent = Array.from(state.typingUsers).join(', ') + ' is typing...'
      indicator.classList.remove('hidden')
    } else {
      indicator.classList.add('hidden')
    }
  }).subscribe(async (status) => {
    if(status === 'SUBSCRIBED') {
      await presenceChannel.track({ user: state.user.username, typing: false })
    }
  })
}

async function handleSendMessage(e) {
  e.preventDefault()
  const input = document.getElementById('messageInput')
  const text = input.value.trim()
  if (!text) return

  // Editing logic
  if (state.editingMessage) {
    const msgId = state.editingMessage.id
    try {
      await supabaseClient.from('messages').update({
        text_content: text,
        is_edited: true
      }).eq('id', msgId)
      
      state.editingMessage = null
      document.getElementById('replyPreviewWrapper').classList.add('hidden')
      input.value = ''
      document.getElementById('sendIcon').setAttribute('data-lucide', 'send')
      lucide.createIcons()
    } catch(err) {
      alert(`Edit failed: ${err.message}`)
    }
    return
  }

  // Optimistic Insert
  const tempId = 'temp-' + Date.now()
  const newMsg = {
    id: tempId,
    sender_id: state.user.id,
    text_content: text,
    created_at: new Date().toISOString(),
    users: { username: state.user.username, avatar_url: state.user.avatar_url },
    is_pending: true,
    reply_to_id: state.replyTo ? state.replyTo.id : null,
    burn_after_seconds: state.burnoutSetting,
    seen_at: null,
    reactions: {}
  }

  state.messages.push(newMsg)
  input.value = ''
  input.style.height = '48px'
  
  const replyId = state.replyTo ? state.replyTo.id : null
  state.replyTo = null
  document.getElementById('replyPreviewWrapper').classList.add('hidden')
  
  renderMessages()
  playSound('send')

  try {
    const { error } = await supabaseClient.from('messages').insert([{
      sender_id: state.user.id,
      message_type: 'text',
      text_content: text,
      reply_to_id: replyId,
      burn_after_seconds: state.burnoutSetting
    }])
    if (error) throw error
  } catch (err) {
    alert(`Message failed: ${err.message}`)
  }
}

let burnoutTimers = []

window.handleReaction = async function(id) {
  const msg = state.messages.find(m => m.id === id)
  if(!msg || msg.is_pending) return
  const currentReactions = msg.reactions || {}
  const hasReacted = currentReactions[state.user.id] === '❤️'
  
  const newReactions = { ...currentReactions }
  if (hasReacted) delete newReactions[state.user.id]
  else newReactions[state.user.id] = '❤️'

  await supabaseClient.from('messages').update({ reactions: newReactions }).eq('id', id)
}

function renderMessages() {
  const container = document.getElementById('messagesContainer')
  if (!container) return

  burnoutTimers.forEach(t => clearInterval(t))
  burnoutTimers = []
  
  // Save scroll state
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

  container.innerHTML = ''
  
  const uniqueMessages = Array.from(new Map(state.messages.map(item => [item.id, item])).values())
  
  // Filter by search
  const filtered = uniqueMessages.filter(m => {
    if(!state.searchQuery) return true
    return (m.text_content && m.text_content.toLowerCase().includes(state.searchQuery))
  })

  // Handle pinned banner
  const pinnedMsgs = uniqueMessages.filter(m => m.is_pinned && !m.is_deleted)
  const pinnedBanner = document.getElementById('pinnedBanner')
  if(pinnedMsgs.length > 0) {
    document.getElementById('pinnedBannerText').textContent = pinnedMsgs[pinnedMsgs.length-1].text_content || 'Media Message'
    pinnedBanner.classList.add('visible')
    document.getElementById('closePinBtn').onclick = () => {
      supabaseClient.from('messages').update({is_pinned: false}).eq('id', pinnedMsgs[pinnedMsgs.length-1].id).then()
    }
  } else {
    pinnedBanner.classList.remove('visible')
  }

  // Handle read receipts for the latest message
  const lastMsg = uniqueMessages[uniqueMessages.length - 1]
  if (lastMsg && !lastMsg.is_pending && lastMsg.sender_id !== state.user.id && !lastMsg.seen_at) {
    // We've seen it!
    supabaseClient.from('messages').update({
      seen_at: new Date().toISOString(),
      seen_by: state.user.id
    }).eq('id', lastMsg.id).then()
  }

  filtered.forEach((msg, idx) => {
    let remainingMs = 0;
    if (msg.burn_after_seconds) {
      const expiresAt = new Date(msg.created_at).getTime() + (msg.burn_after_seconds * 1000)
      remainingMs = expiresAt - Date.now()
      if (remainingMs <= 0 && !msg.is_deleted) {
        supabaseClient.from('messages').update({is_deleted: true}).eq('id', msg.id).then()
        msg.is_deleted = true
      }
    }

    const isMyMsg = msg.sender_id === state.user.id
    const prevMsg = idx > 0 ? filtered[idx - 1] : null
    const showAvatar = !isMyMsg && (!prevMsg || prevMsg.sender_id !== msg.sender_id)
    
    let parsedText = msg.is_deleted ? '<i class="text-zinc-500">This message was burned❤️‍🔥.</i>' : marked.parse(msg.text_content || '')

    const div = document.createElement('div')
    div.className = `flex w-full ${isMyMsg ? 'justify-end pl-12' : 'justify-start pr-12'} mb-2 animate-in slide-in-from-bottom-2`
    div.dataset.id = msg.id
    
    // Swipe to reply, Double-tap to react, Hold context menu logic
    let startX = 0, currentX = 0, touchTimer = null
    let lastTap = 0

    div.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX
      touchTimer = setTimeout(() => {
        openContextMenu(msg, e.touches[0].clientX, e.touches[0].clientY)
      }, 600)
    }, { passive: true })
    
    div.addEventListener('touchmove', e => {
      currentX = e.touches[0].clientX
      const diff = startX - currentX
      if (Math.abs(diff) > 10) clearTimeout(touchTimer)
      if (diff > 0 && diff < 80) {
        div.style.transform = `translateX(-${diff}px)`
      }
    }, { passive: true })
    
    div.addEventListener('touchend', (e) => {
      clearTimeout(touchTimer)
      
      const currentTime = new Date().getTime()
      const tapLength = currentTime - lastTap
      if (tapLength < 300 && tapLength > 0) {
        // Double tap!
        handleReaction(msg.id)
        e.preventDefault()
      }
      lastTap = currentTime

      const diff = startX - currentX
      div.style.transform = 'translateX(0px)'
      div.style.transition = 'transform 0.2s ease-out'
      setTimeout(() => div.style.transition = '', 200)
      
      if (diff > 50 && !msg.is_deleted) {
        if ("vibrate" in navigator) navigator.vibrate(50)
        state.replyTo = msg
        const wrapper = document.getElementById('replyPreviewWrapper')
        document.getElementById('replyPreviewUser').textContent = msg.users.username
        document.getElementById('replyPreviewText').textContent = msg.text_content || 'Media message'
        wrapper.classList.remove('hidden')
      }
    })

    div.addEventListener('contextmenu', e => {
      e.preventDefault()
      openContextMenu(msg, e.clientX, e.clientY)
    })

    let html = ``
    if (showAvatar) {
      html += `<img src="${msg.users.avatar_url}" class="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 mr-2 self-end shadow-sm flex-shrink-0" />`
    } else if (!isMyMsg) {
      html += `<div class="w-8 mr-2 flex-shrink-0"></div>`
    }

    let mediaHtml = ''
    if (!msg.is_deleted) {
      if (msg.message_type === 'image' && msg.media_url) {
        mediaHtml = `<img src="${msg.media_url}" class="rounded-xl max-w-full max-h-64 object-cover mt-1 cursor-pointer hover:opacity-90 transition" onclick="openLightbox('${msg.media_url}')" />`
      } else if (msg.message_type === 'video' && msg.media_url) {
        mediaHtml = `<video src="${msg.media_url}" controls class="rounded-xl max-w-full max-h-64 mt-1"></video>`
      } else if (msg.message_type === 'pdf' && msg.media_url) {
        mediaHtml = `<iframe src="${msg.media_url}#toolbar=0" class="w-full h-80 rounded-xl bg-white mt-1 border border-zinc-300"></iframe>`
      } else if (msg.message_type === 'voice' && msg.media_url) {
        mediaHtml = `
          <div class="custom-audio-player mt-1 flex items-center bg-zinc-900 text-white p-3 rounded-full shadow-lg max-w-xs space-x-3" data-url="${msg.media_url}">
            <button class="audio-play-btn bg-white text-zinc-900 rounded-full p-2 hover:bg-zinc-200 transition duration-200 flex-shrink-0">
              <i data-lucide="play" class="w-4 h-4 fill-current"></i>
            </button>
            <div class="flex items-center space-x-0.5 flex-grow px-1 overflow-hidden relative h-8">
              <div class="w-1 h-3 bg-zinc-600 rounded-full animate-pulse"></div>
              <div class="w-1 h-6 bg-zinc-400 rounded-full"></div>
              <div class="w-1 h-4 bg-zinc-400 rounded-full"></div>
              <div class="w-1 h-8 bg-purple-400 rounded-full"></div>
              <div class="w-1 h-5 bg-zinc-400 rounded-full"></div>
              <div class="w-1 h-3 bg-zinc-600 rounded-full"></div>
              <div class="w-1 h-7 bg-zinc-400 rounded-full"></div>
              <div class="w-1 h-4 bg-zinc-400 rounded-full"></div>
              <input type="range" class="audio-progress absolute inset-0 w-full h-full opacity-0 cursor-pointer" min="0" max="100" value="0" />
            </div>
            <span class="audio-time text-xs text-zinc-300 pr-1 font-mono">0:00</span>
            <button class="audio-speed-btn text-[10px] font-bold text-zinc-400 hover:text-white flex-shrink-0 w-6">1x</button>
          </div>`
      }
    }

    let burnoutHtml = ''
    if (msg.burn_after_seconds && !msg.is_deleted && remainingMs > 0) {
      const pct = (remainingMs / (msg.burn_after_seconds * 1000)) * 100
      burnoutHtml = `<div class="burnout-bar w-full" style="width: ${pct}%" id="burnout-${msg.id}"></div>`
      
      const interval = setInterval(() => {
        const left = new Date(msg.created_at).getTime() + (msg.burn_after_seconds * 1000) - Date.now()
        if(left <= 0) {
          clearInterval(interval)
          if (!msg.is_deleted) supabaseClient.from('messages').update({is_deleted: true}).eq('id', msg.id).then()
        } else {
          const el = document.getElementById(`burnout-${msg.id}`)
          if(el) el.style.width = `${(left / (msg.burn_after_seconds * 1000)) * 100}%`
        }
      }, 100)
      burnoutTimers.push(interval)
    }

    // Reactions display
    let reactionHtml = ''
    if (msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.is_deleted) {
      const count = Object.keys(msg.reactions).length
      reactionHtml = `<div class="absolute -bottom-2 ${isMyMsg ? '-left-2' : '-right-2'} bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-1.5 py-0.5 text-xs shadow-sm z-10">❤️ ${count}</div>`
    }

    // Seen Receipts
    let seenText = ''
    if (isMyMsg && msg.seen_at && !msg.is_deleted) {
      seenText = `• Seen ${formatTime(msg.seen_at)}`
    }

    let statusHtml = `
      <div class="text-[10px] text-zinc-400 mt-1 flex justify-end gap-1">
        <span>${formatTime(msg.created_at)}</span>
        <span>${msg.is_edited && !msg.is_deleted ? '(edited)' : ''}</span>
        <span class="text-lime-600 font-medium">${seenText}</span>
      </div>
    `

    let bubbleClass = ''
    if (msg.message_type === 'voice') {
      bubbleClass = 'bg-transparent text-zinc-900 dark:text-zinc-100 mt-2'
    } else {
      bubbleClass = isMyMsg 
        ? 'px-4 py-2.5 shadow-sm bg-purple-brand text-white rounded-2xl rounded-br-sm' 
        : 'px-4 py-2.5 shadow-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-sm'
    }

    html += `
      <div class="relative group max-w-full">
        <div class="text-[15px] leading-relaxed break-words relative ${bubbleClass} ${msg.is_pending ? 'opacity-70' : ''}">
          <div class="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-pre:my-2">
            ${parsedText}
            ${mediaHtml}
          </div>
          ${burnoutHtml}
          ${statusHtml}
        </div>
        ${reactionHtml}
      </div>
    `
    div.innerHTML = html
    container.appendChild(div)
  })

  lucide.createIcons()
  setupCustomAudioPlayers()
  if(isAtBottom) container.scrollTop = container.scrollHeight
}

function openContextMenu(msg, x, y) {
  const overlay = document.getElementById('contextMenuOverlay')
  const menu = document.getElementById('contextMenu')
  overlay.classList.remove('hidden')
  
  const isMine = msg.sender_id === state.user.id

  let html = `<button class="p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold rounded-t-lg transition flex items-center gap-2" onclick="handleMenuAction('copy', '${msg.id}')"><i data-lucide="copy" class="w-4 h-4"></i> Copy</button>`
  
  if (isMine && !msg.is_deleted && msg.message_type === 'text') {
    html += `<button class="p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold transition flex items-center gap-2" onclick="handleMenuAction('edit', '${msg.id}')"><i data-lucide="edit-2" class="w-4 h-4"></i> Edit</button>`
  }
  
  if (!msg.is_deleted) {
    const pinText = msg.is_pinned ? 'Unpin' : 'Pin'
    html += `<button class="p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold transition flex items-center gap-2" onclick="handleMenuAction('pin', '${msg.id}')"><i data-lucide="pin" class="w-4 h-4"></i> ${pinText}</button>`
  }

  if (isMine && !msg.is_deleted) {
    html += `<button class="p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-800 font-bold rounded-b-lg text-red-500 transition flex items-center gap-2" onclick="handleMenuAction('delete', '${msg.id}')"><i data-lucide="trash-2" class="w-4 h-4"></i> Delete</button>`
  }

  menu.innerHTML = html
  lucide.createIcons()

  const maxLeft = window.innerWidth - 160
  menu.style.left = `${Math.min(x, maxLeft)}px`
  menu.style.top = `${y}px`
}

window.handleMenuAction = function(action, id) {
  const msg = state.messages.find(m => m.id === id)
  if (!msg) return
  
  if (action === 'copy') {
    navigator.clipboard.writeText(msg.text_content || msg.media_url || '')
  } else if (action === 'edit') {
    state.editingMessage = msg
    const wrapper = document.getElementById('replyPreviewWrapper')
    document.getElementById('replyPreviewUser').textContent = 'Editing Message'
    document.getElementById('replyPreviewText').textContent = msg.text_content
    wrapper.classList.remove('hidden')
    document.getElementById('messageInput').value = msg.text_content || ''
    document.getElementById('messageInput').focus()
    document.getElementById('sendIcon').setAttribute('data-lucide', 'check')
    lucide.createIcons()
  } else if (action === 'delete') {
    supabaseClient.from('messages').update({is_deleted: true}).eq('id', id).then()
  } else if (action === 'pin') {
    supabaseClient.from('messages').update({is_pinned: !msg.is_pinned}).eq('id', id).then()
  }
}

function setupCustomAudioPlayers() {
  document.querySelectorAll('.custom-audio-player').forEach(player => {
    if(player.dataset.initialized) return
    player.dataset.initialized = 'true'
    
    const url = player.dataset.url
    const audio = new Audio(url)
    const playBtn = player.querySelector('.audio-play-btn')
    const progress = player.querySelector('.audio-progress')
    const timeDisplay = player.querySelector('.audio-time')
    const speedBtn = player.querySelector('.audio-speed-btn')
    const bars = player.querySelectorAll('.flex-grow > div')

    const speeds = [1, 1.5, 2]
    let speedIdx = 0

    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % speeds.length
      audio.playbackRate = speeds[speedIdx]
      speedBtn.textContent = speeds[speedIdx] + 'x'
    })

    playBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play()
        playBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4 fill-current"></i>'
      } else {
        audio.pause()
        playBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 fill-current"></i>'
      }
      lucide.createIcons()
    })

    audio.addEventListener('timeupdate', () => {
      if(audio.duration) {
        progress.value = (audio.currentTime / audio.duration) * 100
        const m = Math.floor(audio.currentTime / 60)
        const s = Math.floor(audio.currentTime % 60).toString().padStart(2, '0')
        timeDisplay.textContent = `${m}:${s}`

        const activeBars = Math.floor((audio.currentTime / audio.duration) * bars.length)
        bars.forEach((bar, index) => {
          bar.classList.remove('bg-zinc-600', 'bg-zinc-400', 'bg-purple-400', 'bg-blue-400')
          if (index < activeBars) {
            bar.classList.add('bg-blue-400')
          } else {
            bar.classList.add('bg-zinc-600')
          }
        })
      }
    })

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4 fill-current"></i>'
      lucide.createIcons()
      progress.value = 0
      bars.forEach(bar => {
        bar.classList.remove('bg-blue-400', 'bg-zinc-600')
        bar.classList.add('bg-zinc-400')
      })
    })

    progress.addEventListener('input', (e) => {
      if(audio.duration) {
        audio.currentTime = (e.target.value / 100) * audio.duration
      }
    })
  })
}

// Initial App State
const savedUser = localStorage.getItem('tekst_user')
if (savedUser) {
  state.user = JSON.parse(savedUser)
  renderChat()
} else {
  renderLogin()
}
