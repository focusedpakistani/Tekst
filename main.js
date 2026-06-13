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
  replyTo: null
}

const appElement = document.getElementById('app')

// --- AUDIO ---
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
  } catch (e) {
    // Ignore audio errors
  }
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
          <input 
            type="text" 
            id="usernameInput" 
            placeholder="Username" 
            class="w-full p-4 bg-zinc-900 border-2 border-zinc-800 rounded-xl focus:border-purple-brand focus:ring-0 outline-none text-zinc-100 placeholder-zinc-500 font-medium transition"
            required
          />
        </div>
        <div>
          <input 
            type="password" 
            id="passwordInput" 
            placeholder="Password" 
            class="w-full p-4 bg-zinc-900 border-2 border-zinc-800 rounded-xl focus:border-purple-brand focus:ring-0 outline-none text-zinc-100 placeholder-zinc-500 font-medium transition"
            required
          />
        </div>
        
        <div id="errorDisplay" class="text-red-400 text-sm font-bold h-5 text-center"></div>

        <button 
          type="submit" 
          id="loginBtn"
          class="w-full py-4 rounded-xl bg-purple-brand text-white font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
        >
          Enter Tekst
        </button>
      </form>
    </div>
  `

  document.getElementById('loginForm').addEventListener('submit', handleLogin)
}

function renderChat() {
  appElement.innerHTML = `
    <!-- Header -->
    <header class="p-4 bg-white dark:bg-zinc-950 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 z-10 shadow-sm relative">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full border-2 border-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative group cursor-pointer">
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
      <button id="logoutBtn" class="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition text-zinc-600 dark:text-zinc-400 hover:text-red-500">
        <i data-lucide="log-out" class="w-5 h-5"></i>
      </button>
    </header>

    <!-- Messages -->
    <main id="messagesContainer" class="flex-1 overflow-y-auto w-full no-scrollbar flex flex-col p-4 space-y-4 relative bg-zinc-50 dark:bg-zinc-950">
      <div class="text-center text-zinc-500 text-xs py-10 font-bold uppercase tracking-wider">Welcome to the void.</div>
    </main>

    <!-- Composer -->
    <footer class="p-3 bg-white dark:bg-zinc-900 border-t-2 border-zinc-900 relative">
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

      <form id="composeForm" class="flex items-end gap-2 relative">
        <button type="button" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all relative overflow-hidden">
          <i data-lucide="paperclip" class="w-5 h-5"></i>
          <input type="file" id="mediaInput" accept="image/*,video/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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
        </div>
        
        <button type="button" id="micBtn" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-red-500 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all select-none">
          <i data-lucide="mic" class="w-5 h-5"></i>
        </button>

        <button type="submit" class="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-purple-brand text-white border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-purple-600 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all">
          <i data-lucide="send" class="w-5 h-5"></i>
        </button>
      </form>
    </footer>
  `

  lucide.createIcons()

  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.user = null
    localStorage.removeItem('tekst_user')
    renderLogin()
  })

  const composeForm = document.getElementById('composeForm')
  const messageInput = document.getElementById('messageInput')
  const emojiToggleBtn = document.getElementById('emojiToggleBtn')
  const emojiPickerWrapper = document.getElementById('emojiPickerWrapper')
  const cancelReplyBtn = document.getElementById('cancelReplyBtn')
  
  cancelReplyBtn.addEventListener('click', () => {
    state.replyTo = null
    document.getElementById('replyPreviewWrapper').classList.add('hidden')
  })

  // Emoji logic
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
  
  // Auto-resize textarea
  messageInput.addEventListener('input', function() {
    this.style.height = '48px'
    this.style.height = (this.scrollHeight) + 'px'
  })

  composeForm.addEventListener('submit', handleSendMessage)
  
  // Media Input
  const mediaInput = document.getElementById('mediaInput')
  if(mediaInput) {
    mediaInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      uploadMedia(file, file.type.startsWith('video/') ? 'video' : 'image')
    })
  }

  // Voice Recording
  let mediaRecorder;
  let audioChunks = [];
  const micBtn = document.getElementById('micBtn')
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
        micBtn.classList.add('bg-red-200', 'dark:bg-red-900', 'animate-pulse')
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
      micBtn.classList.remove('bg-red-200', 'dark:bg-red-900', 'animate-pulse')
    }
  }
  
  fetchMessages()
  setupRealtime()
}

// --- LOGIC ---
async function handleLogin(e) {
  e.preventDefault()
  if (state.isLoading) return

  const username = document.getElementById('usernameInput').value.trim()
  const password = document.getElementById('passwordInput').value.trim()
  const errorDisplay = document.getElementById('errorDisplay')
  const loginBtn = document.getElementById('loginBtn')

  if (!username || !password) {
    errorDisplay.textContent = 'Enter valid credentials.'
    return
  }

  state.isLoading = true
  loginBtn.textContent = 'Connecting...'
  errorDisplay.textContent = ''

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (error) throw error

    if (data) {
      if (data.password === password) {
        state.user = data
        localStorage.setItem('tekst_user', JSON.stringify(data))
        renderChat()
      } else {
        errorDisplay.textContent = 'Incorrect password.'
      }
    } else {
      errorDisplay.textContent = 'User not found. Registration is closed.'
    }
  } catch (err) {
    errorDisplay.textContent = 'Database error.'
  } finally {
    state.isLoading = false
    if (!state.user) {
      loginBtn.textContent = 'Enter Tekst'
    }
  }
}

async function fetchMessages() {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*, users!inner(username, avatar_url)')
    .order('created_at', { ascending: true })
    .limit(100)

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
    const { error: uploadError } = await supabaseClient.storage
      .from('chat_media')
      .upload(filePath, file)
    
    if (uploadError) throw uploadError
    
    const { data: publicUrlData } = supabaseClient.storage
      .from('chat_media')
      .getPublicUrl(filePath)
      
    const mediaUrl = publicUrlData.publicUrl

    // Send message
    const replyId = state.replyTo ? state.replyTo.id : null
    state.replyTo = null
    const replyWrapper = document.getElementById('replyPreviewWrapper')
    if(replyWrapper) replyWrapper.classList.add('hidden')

    await supabaseClient.from('messages').insert([{
      user_id: state.user.id,
      message_type: type,
      media_url: mediaUrl,
      reply_to_id: replyId
    }])
  } catch(err) {
    console.error('Upload failed:', err)
  } finally {
    state.isLoading = false
  }
}

let realtimeChannel = null
function setupRealtime() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel)

  realtimeChannel = supabaseClient.channel('public:messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        // Fetch user data for the new message
        const { data: userData } = await supabaseClient.from('users').select('username, avatar_url').eq('id', payload.new.user_id).single()
        if (userData) {
          const newMsg = { ...payload.new, users: userData }
          state.messages.push(newMsg)
          renderMessages()
          
          if (newMsg.user_id !== state.user.id) {
            playSound('receive')
          }
        }
      }
    })
    .subscribe()
}

async function handleSendMessage(e) {
  e.preventDefault()
  const input = document.getElementById('messageInput')
  const text = input.value.trim()
  
  if (!text) return

  // Optimistic UI
  const tempId = 'temp-' + Date.now()
  const newMsg = {
    id: tempId,
    user_id: state.user.id,
    text_content: text,
    created_at: new Date().toISOString(),
    users: {
      username: state.user.username,
      avatar_url: state.user.avatar_url
    },
    is_pending: true,
    reply_to_id: state.replyTo ? state.replyTo.id : null
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
      user_id: state.user.id,
      message_type: 'text',
      text_content: text,
      reply_to_id: replyId
    }])
    if (error) throw error
    // Pending message will be replaced by realtime INSERT
  } catch (err) {
    console.error('Failed to send:', err)
  }
}

function renderMessages() {
  const container = document.getElementById('messagesContainer')
  if (!container) return

  container.innerHTML = ''
  
  // Dedup logic (realtime + optimistic might overlap briefly)
  const uniqueMessages = Array.from(new Map(state.messages.map(item => [item.id, item])).values())
  // Filter out pending messages that already have a real equivalent (same user and text within last few seconds)
  
  uniqueMessages.forEach((msg, idx) => {
    const isMyMsg = msg.user_id === state.user.id
    const prevMsg = idx > 0 ? uniqueMessages[idx - 1] : null
    const showAvatar = !isMyMsg && (!prevMsg || prevMsg.user_id !== msg.user_id)
    
    // Convert markdown using marked.js
    const parsedText = marked.parse(msg.text_content || '')

    const div = document.createElement('div')
    div.className = `flex w-full ${isMyMsg ? 'justify-end pl-12' : 'justify-start pr-12'} mb-2 animate-in slide-in-from-bottom-2`
    div.dataset.id = msg.id
    
    // Swipe to reply logic
    let startX = 0
    let currentX = 0
    
    div.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX
    }, { passive: true })
    
    div.addEventListener('touchmove', e => {
      currentX = e.touches[0].clientX
      const diff = startX - currentX
      if (diff > 0 && diff < 80) {
        div.style.transform = `translateX(-${diff}px)`
      }
    }, { passive: true })
    
    div.addEventListener('touchend', () => {
      const diff = startX - currentX
      div.style.transform = 'translateX(0px)'
      div.style.transition = 'transform 0.2s ease-out'
      setTimeout(() => div.style.transition = '', 200)
      
      if (diff > 50) {
        if ("vibrate" in navigator) navigator.vibrate(50)
        state.replyTo = msg
        const wrapper = document.getElementById('replyPreviewWrapper')
        document.getElementById('replyPreviewUser').textContent = msg.users.username
        document.getElementById('replyPreviewText').textContent = msg.text_content
        wrapper.classList.remove('hidden')
      }
    })

    let html = ``
    if (showAvatar) {
      html += `<img src="${msg.users.avatar_url}" class="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 mr-2 self-end shadow-sm" />`
    } else if (!isMyMsg) {
      html += `<div class="w-8 mr-2"></div>`
    }

    let mediaHtml = ''
    if (msg.message_type === 'image' && msg.media_url) {
      mediaHtml = `<img src="${msg.media_url}" class="rounded-xl max-w-full max-h-64 object-cover mt-1" />`
    } else if (msg.message_type === 'video' && msg.media_url) {
      mediaHtml = `<video src="${msg.media_url}" controls class="rounded-xl max-w-full max-h-64 mt-1"></video>`
    } else if (msg.message_type === 'voice' && msg.media_url) {
      mediaHtml = `<audio src="${msg.media_url}" controls class="w-48 mt-1"></audio>`
    }

    html += `
      <div class="relative group max-w-full">
        <div class="px-4 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words ${
          isMyMsg 
            ? 'bg-purple-brand text-white rounded-br-sm' 
            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
        } ${msg.is_pending ? 'opacity-70' : ''}">
          <div class="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-pre:my-2">
            ${parsedText}
            ${mediaHtml}
          </div>
        </div>
      </div>
    `
    div.innerHTML = html
    container.appendChild(div)
  })

  // Scroll to bottom
  container.scrollTop = container.scrollHeight
}

// Initial App State
const savedUser = localStorage.getItem('tekst_user')
if (savedUser) {
  state.user = JSON.parse(savedUser)
  renderChat()
} else {
  renderLogin()
}
