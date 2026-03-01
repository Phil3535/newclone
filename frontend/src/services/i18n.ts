import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// English translations
const en = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    refresh: 'Refresh',
    retry: 'Retry',
    offline: 'You are offline',
    online: 'Back online',
    syncing: 'Syncing...',
  },
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    leads: 'Leads',
    territories: 'Territories',
    calendar: 'Calendar',
    analytics: 'Analytics',
    more: 'More',
  },
  // Dashboard
  dashboard: {
    greeting_morning: 'Good Morning',
    greeting_afternoon: 'Good Afternoon',
    greeting_evening: 'Good Evening',
    monthly_revenue: 'Monthly Revenue',
    target: 'Target',
    total_leads: 'Total Leads',
    qualified: 'Qualified',
    todays_appts: "Today's Appts",
    conversion: 'Conversion',
    todays_appointments: "Today's Appointments",
    no_appointments: 'No appointments scheduled for today',
    leaderboard: 'Leaderboard',
    quick_actions: 'Quick Actions',
    new_lead: 'New Lead',
    schedule: 'Schedule',
    reports: 'Reports',
    see_all: 'See All',
    of_target: 'of target achieved',
    deals: 'deals',
    appts: 'appts',
  },
  // Leads
  leads: {
    title: 'Leads',
    search_placeholder: 'Search leads...',
    new_lead: 'New Lead',
    lead_details: 'Lead Details',
    no_leads: 'No leads found',
    add_new_lead: 'Add New Lead',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    zip_code: 'ZIP Code',
    homeowner: 'Homeowner',
    roof_type: 'Roof Type',
    bill_amount: 'Monthly Electric Bill',
    timeline: 'Timeline',
    source: 'Source',
    notes: 'Notes',
    ai_score: 'AI Score',
    probability: 'Probability to Close',
    status: 'Status',
    update_status: 'Update Status',
    rescore: 'Re-score with AI',
    create_score: 'Create & AI Score',
    hot: 'Hot',
    warm: 'Warm',
    cool: 'Cool',
    cold: 'Cold',
    to_close: 'to close',
    // Status
    status_new: 'New',
    status_contacted: 'Contacted',
    status_qualified: 'Qualified',
    status_appointment: 'Appointment',
    status_won: 'Won',
    status_lost: 'Lost',
    // Roof types
    roof_asphalt: 'Asphalt',
    roof_tile: 'Tile',
    roof_metal: 'Metal',
    roof_flat: 'Flat',
    // Timelines
    timeline_immediate: 'Immediate',
    timeline_1_3: '1-3 months',
    timeline_3_6: '3-6 months',
    timeline_6_plus: '6+ months',
    // Sources
    source_web: 'Web Form',
    source_ad: 'Ad Campaign',
    source_organic: 'Organic',
    source_referral: 'Referral',
  },
  // Territories
  territories: {
    title: 'Territories',
    subtitle: 'Priority Zone Mapping',
    heat_map: 'Territory Heat Map',
    zip_codes: 'ZIP Codes',
    high_priority: 'High Priority',
    close_rate: 'Close Rate',
    avg_home: 'Avg Home',
    utility: 'Utility',
    incentives: 'Incentives',
    priority_level: 'Priority Level',
    hot: 'Hot (70+)',
    warm: 'Warm (50-69)',
    cool: 'Cool (30-49)',
    cold: 'Cold (<30)',
    no_territories: 'No territories found',
  },
  // Calendar
  calendar: {
    title: 'Calendar',
    subtitle: 'Appointment Scheduler',
    schedule_appointment: 'Schedule Appointment',
    schedule: 'Schedule',
    appointment_details: 'Appointment Details',
    no_appointments: 'No appointments for this day',
    no_qualified_leads: 'No qualified leads available',
    select_lead: 'Select Lead',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    minutes: 'minutes',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    cancel: 'Cancel',
    navigate: 'Navigate',
    call: 'Call',
    appointment: 'appointment',
    appointments: 'appointments',
  },
  // Analytics
  analytics: {
    title: 'Analytics',
    subtitle: 'Performance Dashboard',
    revenue_overview: 'Revenue Overview',
    total_revenue: 'Total Revenue',
    commission: 'Commission',
    installations: 'Installations',
    key_metrics: 'Key Metrics',
    total_leads: 'Total Leads',
    appointments: 'Appointments',
    completion_rate: 'Completion Rate',
    sales_funnel: 'Sales Funnel',
    top_performers: 'Top Performers',
    ai_insights: 'AI Insights',
    revenue: 'revenue',
    insight_title: 'Focus on High-Score Leads',
    insight_text: 'Leads with AI scores above 70 have a 3x higher conversion rate. Prioritize these in your daily outreach.',
  },
  // More/Advanced Features
  more: {
    title: 'Advanced Features',
    subtitle: 'Enterprise Tools & Analytics',
    forecasting: 'Predictive Forecasting',
    forecasting_desc: 'AI-powered revenue predictions',
    blockchain: 'Blockchain Ledger',
    blockchain_desc: 'Immutable transaction records',
    compliance: 'Compliance Tracker',
    compliance_desc: 'Permits & regulatory status',
    partner: 'Partner/Investor Portal',
    partner_desc: 'ROI tracking & territory performance',
    system_status: 'System Status',
    api_status: 'API Status',
    sms_service: 'SMS Service',
    ai_scoring: 'AI Scoring',
    online: 'Online',
    active: 'Active',
    ready: 'Ready',
    chain_valid: 'Chain Valid',
    chain_invalid: 'Chain Invalid',
    transactions: 'transactions',
    total_revenue: 'Total Revenue',
    commissions: 'Commissions',
    partner_payouts: 'Partner Payouts',
    net_revenue: 'Net Revenue',
    compliant: 'Compliant',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    expiring_soon: 'permit(s) expiring within 30 days',
    outlook: 'Outlook',
    predicted_revenue: 'Predicted Revenue',
  },
  // Settings
  settings: {
    title: 'Settings',
    language: 'Language',
    english: 'English',
    spanish: 'Español',
    notifications: 'Notifications',
    offline_mode: 'Offline Mode',
    sync_data: 'Sync Data',
    clear_cache: 'Clear Cache',
    about: 'About',
    version: 'Version',
    theme: 'Theme',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
  },
  // Quick Tools
  quickTools: {
    solar_calculator: 'Solar Calculator',
    solar_calculator_desc: 'Estimate savings',
    ai_assistant: 'AI Assistant',
    ai_assistant_desc: 'Sales coaching',
    achievements: 'Achievements',
    achievements_desc: 'Badges & rewards',
    route_optimizer: 'Route Optimizer',
    route_optimizer_desc: 'Plan your day',
  },
  // Power Tools
  powerTools: {
    proposals: 'Proposals',
    proposals_desc: 'Generate PDFs',
    voice_control: 'Voice Control',
    voice_control_desc: 'Hands-free',
    voice_notes: 'Voice Notes',
    voice_notes_desc: 'Quick memos',
    commissions: 'Commissions',
    commissions_desc: 'Track earnings',
  },
  // Legendary Tools
  legendaryTools: {
    team_chat: 'Team Chat',
    team_chat_desc: 'Real-time messaging',
    training_videos: 'Training Videos',
    training_videos_desc: 'Learn & grow',
    competitors: 'Competitors',
    competitors_desc: 'Win more deals',
    testimonials: 'Testimonials',
    testimonials_desc: 'Customer stories',
  },
  // Competition
  competition: {
    live_leaderboard: 'Live Leaderboard',
    live_leaderboard_desc: 'See real-time rankings & celebrate wins!',
    live: 'LIVE',
  },
  // Solar Calculator
  calculator: {
    title: 'Solar Calculator',
    subtitle: 'Estimate Your Savings',
    monthly_bill: 'Monthly Electric Bill ($)',
    roof_size: 'Roof Size (sq meters)',
    sun_hours: 'Peak Sun Hours/Day',
    calculate: 'Calculate Savings',
    your_estimate: 'Your Solar Estimate',
    savings_25_year: '25-Year Savings',
    payback_in: 'Payback in',
    years: 'years',
    panels: 'Panels',
    system_size: 'System Size',
    monthly_savings: 'Monthly Savings',
    annual_savings: 'Annual Savings',
    investment_breakdown: 'Investment Breakdown',
    system_cost: 'System Cost',
    federal_tax_credit: 'Federal Tax Credit (30%)',
    net_cost: 'Net Cost',
    co2_offset: "You'll offset %{amount} kg of CO2 annually!",
  },
  // AI Assistant
  assistant: {
    title: 'AI Sales Assistant',
    subtitle: 'Powered by GPT-4o',
    placeholder: 'Ask me anything about solar sales...',
    opening_script: 'Opening script for cold leads',
    handle_objection: 'Handle "too expensive" objection',
    explain_roi: 'Explain ROI to skeptical customer',
    common_questions: 'Common homeowner questions',
    welcome: "Hi! I'm your Solar Sales AI Assistant. I can help you with:\n\n• Sales scripts & talking points\n• Objection handling\n• Product knowledge\n• Financing explanations\n• Closing techniques\n\nHow can I help you close more deals today?",
    error: "I'm having trouble connecting right now. Please check your connection and try again.",
    not_configured: 'AI assistant is not configured. Please contact support.',
  },
  // Achievements/Gamification
  achievements: {
    title: 'Achievements',
    subtitle: 'Track Your Progress',
    level: 'Level',
    xp: 'XP',
    day_streak: 'Day Streak',
    badges: 'Badges',
    best_streak: 'Best Streak',
    daily_challenges: 'Daily Challenges',
  },
  // Route Optimizer
  routeOptimizer: {
    title: 'Route Optimizer',
    subtitle: 'Plan Your Day',
    stops: 'stops',
    optimize_route: 'Optimize Route',
    start_navigation: 'Start Navigation',
    total_distance: 'Total Distance',
    estimated_time: 'Estimated Time',
    miles: 'miles',
    mins: 'mins',
  },
  // Team Chat
  teamChat: {
    title: 'Team Chat',
    online: 'online',
    placeholder: 'Message your team...',
  },
  // Training Videos
  trainingVideos: {
    title: 'Training Videos',
    videos_available: 'Videos Available',
    your_progress: 'Your Progress',
    completed: 'completed',
    all: 'All',
    sales_scripts: 'Sales Scripts',
    objections: 'Objections',
    products: 'Products',
    closing: 'Closing',
    new: 'NEW',
    views: 'views',
  },
  // Competitor Comparison
  competitorComparison: {
    title: 'Compare Competitors',
    subtitle: 'Win More Deals',
    select_competitor: 'Select Competitor',
    vs: 'VS',
    us: 'US',
    price_per_watt: 'Price per Watt',
    warranty_years: 'Warranty (Years)',
    panel_efficiency: 'Panel Efficiency',
    install_time: 'Install Time',
    financing_available: 'Financing Available',
    monitoring: '24/7 Monitoring',
    customer_rating: 'Customer Rating',
    key_talking_points: 'Key Talking Points',
    cheaper: "We're $%{amount}/watt cheaper!",
    longer_warranty: '%{years} years longer warranty',
    more_efficient: '%{percent}% more efficient panels',
    higher_satisfaction: 'Higher customer satisfaction (%{ours} vs %{theirs})',
    local_company: 'Local company = faster service & support',
  },
  // Testimonials
  testimonials: {
    title: 'Customer Stories',
    happy_customers: 'Happy Customers',
    reviews: 'Reviews',
    would_recommend: 'Would recommend',
    avg_savings: 'Avg. savings',
    avg_system: 'Avg. system',
    video: 'VIDEO',
    watch_video: 'Watch Video Testimonial',
    per_year: '/yr',
  },
  // Voice Notes
  voiceNotes: {
    title: 'Voice Notes',
    subtitle: 'Quick Audio Memos',
    tap_to_record: 'Tap to Record',
    recording: 'Recording...',
    no_notes: 'No voice notes yet',
    record_first: 'Record your first voice note!',
  },
  // Proposal Generator
  proposalGenerator: {
    title: 'Proposal Generator',
    subtitle: 'Create Professional PDFs',
    select_lead: 'Select Lead',
    system_size: 'System Size (kW)',
    price_per_watt: 'Price per Watt ($)',
    generate_proposal: 'Generate Proposal',
    download_pdf: 'Download PDF',
    send_to_customer: 'Send to Customer',
  },
};

// Spanish translations
const es = {
  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtrar',
    all: 'Todos',
    none: 'Ninguno',
    yes: 'Sí',
    no: 'No',
    ok: 'OK',
    back: 'Atrás',
    next: 'Siguiente',
    done: 'Listo',
    refresh: 'Actualizar',
    retry: 'Reintentar',
    offline: 'Sin conexión',
    online: 'Conectado',
    syncing: 'Sincronizando...',
  },
  // Navigation
  nav: {
    dashboard: 'Inicio',
    leads: 'Prospectos',
    territories: 'Territorios',
    calendar: 'Calendario',
    analytics: 'Análisis',
    more: 'Más',
  },
  // Dashboard
  dashboard: {
    greeting_morning: 'Buenos Días',
    greeting_afternoon: 'Buenas Tardes',
    greeting_evening: 'Buenas Noches',
    monthly_revenue: 'Ingresos Mensuales',
    target: 'Meta',
    total_leads: 'Total Prospectos',
    qualified: 'Calificados',
    todays_appts: 'Citas Hoy',
    conversion: 'Conversión',
    todays_appointments: 'Citas de Hoy',
    no_appointments: 'No hay citas programadas para hoy',
    leaderboard: 'Clasificación',
    quick_actions: 'Acciones Rápidas',
    new_lead: 'Nuevo Prospecto',
    schedule: 'Programar',
    reports: 'Reportes',
    see_all: 'Ver Todo',
    of_target: 'de la meta alcanzada',
    deals: 'ventas',
    appts: 'citas',
  },
  // Leads
  leads: {
    title: 'Prospectos',
    search_placeholder: 'Buscar prospectos...',
    new_lead: 'Nuevo Prospecto',
    lead_details: 'Detalles del Prospecto',
    no_leads: 'No se encontraron prospectos',
    add_new_lead: 'Agregar Nuevo Prospecto',
    name: 'Nombre',
    email: 'Correo',
    phone: 'Teléfono',
    address: 'Dirección',
    zip_code: 'Código Postal',
    homeowner: 'Propietario',
    roof_type: 'Tipo de Techo',
    bill_amount: 'Factura Eléctrica Mensual',
    timeline: 'Plazo',
    source: 'Origen',
    notes: 'Notas',
    ai_score: 'Puntuación IA',
    probability: 'Probabilidad de Cierre',
    status: 'Estado',
    update_status: 'Actualizar Estado',
    rescore: 'Recalcular con IA',
    create_score: 'Crear y Evaluar con IA',
    hot: 'Caliente',
    warm: 'Tibio',
    cool: 'Frío',
    cold: 'Muy Frío',
    to_close: 'de cerrar',
    // Status
    status_new: 'Nuevo',
    status_contacted: 'Contactado',
    status_qualified: 'Calificado',
    status_appointment: 'Cita',
    status_won: 'Ganado',
    status_lost: 'Perdido',
    // Roof types
    roof_asphalt: 'Asfalto',
    roof_tile: 'Teja',
    roof_metal: 'Metal',
    roof_flat: 'Plano',
    // Timelines
    timeline_immediate: 'Inmediato',
    timeline_1_3: '1-3 meses',
    timeline_3_6: '3-6 meses',
    timeline_6_plus: '6+ meses',
    // Sources
    source_web: 'Formulario Web',
    source_ad: 'Campaña Publicitaria',
    source_organic: 'Orgánico',
    source_referral: 'Referido',
  },
  // Territories
  territories: {
    title: 'Territorios',
    subtitle: 'Mapeo de Zonas Prioritarias',
    heat_map: 'Mapa de Calor',
    zip_codes: 'Códigos Postales',
    high_priority: 'Alta Prioridad',
    close_rate: 'Tasa de Cierre',
    avg_home: 'Casa Promedio',
    utility: 'Utilidad',
    incentives: 'Incentivos',
    priority_level: 'Nivel de Prioridad',
    hot: 'Caliente (70+)',
    warm: 'Tibio (50-69)',
    cool: 'Frío (30-49)',
    cold: 'Muy Frío (<30)',
    no_territories: 'No se encontraron territorios',
  },
  // Calendar
  calendar: {
    title: 'Calendario',
    subtitle: 'Programador de Citas',
    schedule_appointment: 'Programar Cita',
    schedule: 'Programar',
    appointment_details: 'Detalles de la Cita',
    no_appointments: 'No hay citas para este día',
    no_qualified_leads: 'No hay prospectos calificados disponibles',
    select_lead: 'Seleccionar Prospecto',
    date: 'Fecha',
    time: 'Hora',
    duration: 'Duración',
    minutes: 'minutos',
    scheduled: 'Programada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No Asistió',
    cancel: 'Cancelar',
    navigate: 'Navegar',
    call: 'Llamar',
    appointment: 'cita',
    appointments: 'citas',
  },
  // Analytics
  analytics: {
    title: 'Análisis',
    subtitle: 'Panel de Rendimiento',
    revenue_overview: 'Resumen de Ingresos',
    total_revenue: 'Ingresos Totales',
    commission: 'Comisión',
    installations: 'Instalaciones',
    key_metrics: 'Métricas Clave',
    total_leads: 'Total Prospectos',
    appointments: 'Citas',
    completion_rate: 'Tasa de Completación',
    sales_funnel: 'Embudo de Ventas',
    top_performers: 'Mejores Vendedores',
    ai_insights: 'Insights de IA',
    revenue: 'ingresos',
    insight_title: 'Enfócate en Prospectos de Alta Puntuación',
    insight_text: 'Los prospectos con puntuación IA superior a 70 tienen 3 veces más tasa de conversión. Priorízalos en tu alcance diario.',
  },
  // More/Advanced Features
  more: {
    title: 'Funciones Avanzadas',
    subtitle: 'Herramientas Empresariales',
    forecasting: 'Pronóstico Predictivo',
    forecasting_desc: 'Predicciones de ingresos con IA',
    blockchain: 'Libro Blockchain',
    blockchain_desc: 'Registros inmutables',
    compliance: 'Seguimiento de Cumplimiento',
    compliance_desc: 'Permisos y estado regulatorio',
    partner: 'Portal de Socios/Inversionistas',
    partner_desc: 'Seguimiento de ROI y rendimiento',
    system_status: 'Estado del Sistema',
    api_status: 'Estado de API',
    sms_service: 'Servicio SMS',
    ai_scoring: 'Puntuación IA',
    online: 'En Línea',
    active: 'Activo',
    ready: 'Listo',
    chain_valid: 'Cadena Válida',
    chain_invalid: 'Cadena Inválida',
    transactions: 'transacciones',
    total_revenue: 'Ingresos Totales',
    commissions: 'Comisiones',
    partner_payouts: 'Pagos a Socios',
    net_revenue: 'Ingresos Netos',
    compliant: 'Cumpliendo',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    expiring_soon: 'permiso(s) venciendo en 30 días',
    outlook: 'Perspectiva',
    predicted_revenue: 'Ingresos Proyectados',
  },
  // Settings
  settings: {
    title: 'Configuración',
    language: 'Idioma',
    english: 'English',
    spanish: 'Español',
    notifications: 'Notificaciones',
    offline_mode: 'Modo Sin Conexión',
    sync_data: 'Sincronizar Datos',
    clear_cache: 'Borrar Caché',
    about: 'Acerca de',
    version: 'Versión',
    theme: 'Tema',
    dark_mode: 'Modo Oscuro',
    light_mode: 'Modo Claro',
  },
  // Quick Tools
  quickTools: {
    solar_calculator: 'Calculadora Solar',
    solar_calculator_desc: 'Estimar ahorros',
    ai_assistant: 'Asistente IA',
    ai_assistant_desc: 'Asesoría de ventas',
    achievements: 'Logros',
    achievements_desc: 'Insignias y premios',
    route_optimizer: 'Optimizador de Rutas',
    route_optimizer_desc: 'Planifica tu día',
  },
  // Power Tools
  powerTools: {
    proposals: 'Propuestas',
    proposals_desc: 'Generar PDFs',
    voice_control: 'Control de Voz',
    voice_control_desc: 'Manos libres',
    voice_notes: 'Notas de Voz',
    voice_notes_desc: 'Memos rápidos',
    commissions: 'Comisiones',
    commissions_desc: 'Seguir ganancias',
  },
  // Legendary Tools
  legendaryTools: {
    team_chat: 'Chat de Equipo',
    team_chat_desc: 'Mensajería en tiempo real',
    training_videos: 'Videos de Capacitación',
    training_videos_desc: 'Aprende y crece',
    competitors: 'Competidores',
    competitors_desc: 'Gana más ventas',
    testimonials: 'Testimonios',
    testimonials_desc: 'Historias de clientes',
  },
  // Competition
  competition: {
    live_leaderboard: 'Tabla en Vivo',
    live_leaderboard_desc: '¡Mira rankings en tiempo real y celebra victorias!',
    live: 'EN VIVO',
  },
  // Solar Calculator
  calculator: {
    title: 'Calculadora Solar',
    subtitle: 'Estima Tus Ahorros',
    monthly_bill: 'Factura Eléctrica Mensual ($)',
    roof_size: 'Tamaño del Techo (m²)',
    sun_hours: 'Horas Pico de Sol/Día',
    calculate: 'Calcular Ahorros',
    your_estimate: 'Tu Estimación Solar',
    savings_25_year: 'Ahorro en 25 Años',
    payback_in: 'Recuperación en',
    years: 'años',
    panels: 'Paneles',
    system_size: 'Tamaño del Sistema',
    monthly_savings: 'Ahorro Mensual',
    annual_savings: 'Ahorro Anual',
    investment_breakdown: 'Desglose de Inversión',
    system_cost: 'Costo del Sistema',
    federal_tax_credit: 'Crédito Fiscal Federal (30%)',
    net_cost: 'Costo Neto',
    co2_offset: '¡Compensarás %{amount} kg de CO2 anualmente!',
  },
  // AI Assistant
  assistant: {
    title: 'Asistente de Ventas IA',
    subtitle: 'Potenciado por GPT-4o',
    placeholder: 'Pregúntame sobre ventas solares...',
    opening_script: 'Guión de apertura para leads fríos',
    handle_objection: 'Manejar objeción "muy caro"',
    explain_roi: 'Explicar ROI a cliente escéptico',
    common_questions: 'Preguntas comunes de propietarios',
    welcome: '¡Hola! Soy tu Asistente de Ventas IA. Puedo ayudarte con:\n\n• Guiones y puntos de conversación\n• Manejo de objeciones\n• Conocimiento de productos\n• Explicaciones de financiamiento\n• Técnicas de cierre\n\n¿Cómo puedo ayudarte a cerrar más ventas hoy?',
    error: 'Tengo problemas para conectar ahora. Por favor verifica tu conexión e intenta de nuevo.',
    not_configured: 'El asistente IA no está configurado. Por favor contacta soporte.',
  },
  // Achievements/Gamification
  achievements: {
    title: 'Logros',
    subtitle: 'Sigue Tu Progreso',
    level: 'Nivel',
    xp: 'XP',
    day_streak: 'Racha de Días',
    badges: 'Insignias',
    best_streak: 'Mejor Racha',
    daily_challenges: 'Desafíos Diarios',
  },
  // Route Optimizer
  routeOptimizer: {
    title: 'Optimizador de Rutas',
    subtitle: 'Planifica Tu Día',
    stops: 'paradas',
    optimize_route: 'Optimizar Ruta',
    start_navigation: 'Iniciar Navegación',
    total_distance: 'Distancia Total',
    estimated_time: 'Tiempo Estimado',
    miles: 'millas',
    mins: 'mins',
  },
  // Team Chat
  teamChat: {
    title: 'Chat de Equipo',
    online: 'en línea',
    placeholder: 'Mensaje a tu equipo...',
  },
  // Training Videos
  trainingVideos: {
    title: 'Videos de Capacitación',
    videos_available: 'Videos Disponibles',
    your_progress: 'Tu Progreso',
    completed: 'completados',
    all: 'Todos',
    sales_scripts: 'Guiones de Ventas',
    objections: 'Objeciones',
    products: 'Productos',
    closing: 'Cierre',
    new: 'NUEVO',
    views: 'vistas',
  },
  // Competitor Comparison
  competitorComparison: {
    title: 'Comparar Competidores',
    subtitle: 'Gana Más Ventas',
    select_competitor: 'Seleccionar Competidor',
    vs: 'VS',
    us: 'NOSOTROS',
    price_per_watt: 'Precio por Watt',
    warranty_years: 'Garantía (Años)',
    panel_efficiency: 'Eficiencia de Paneles',
    install_time: 'Tiempo de Instalación',
    financing_available: 'Financiamiento Disponible',
    monitoring: 'Monitoreo 24/7',
    customer_rating: 'Calificación de Clientes',
    key_talking_points: 'Puntos Clave de Venta',
    cheaper: '¡Somos $%{amount}/watt más baratos!',
    longer_warranty: '%{years} años más de garantía',
    more_efficient: '%{percent}% más eficientes los paneles',
    higher_satisfaction: 'Mayor satisfacción del cliente (%{ours} vs %{theirs})',
    local_company: 'Empresa local = servicio y soporte más rápido',
  },
  // Testimonials
  testimonials: {
    title: 'Historias de Clientes',
    happy_customers: 'Clientes Felices',
    reviews: 'Reseñas',
    would_recommend: 'Recomendarían',
    avg_savings: 'Ahorro prom.',
    avg_system: 'Sistema prom.',
    video: 'VIDEO',
    watch_video: 'Ver Video Testimonial',
    per_year: '/año',
  },
  // Voice Notes
  voiceNotes: {
    title: 'Notas de Voz',
    subtitle: 'Memos de Audio Rápidos',
    tap_to_record: 'Toca para Grabar',
    recording: 'Grabando...',
    no_notes: 'Sin notas de voz aún',
    record_first: '¡Graba tu primera nota de voz!',
  },
  // Proposal Generator
  proposalGenerator: {
    title: 'Generador de Propuestas',
    subtitle: 'Crea PDFs Profesionales',
    select_lead: 'Seleccionar Prospecto',
    system_size: 'Tamaño del Sistema (kW)',
    price_per_watt: 'Precio por Watt ($)',
    generate_proposal: 'Generar Propuesta',
    download_pdf: 'Descargar PDF',
    send_to_customer: 'Enviar al Cliente',
  },
};

// Create i18n instance
const i18n = new I18n({
  en,
  es,
});

// Set default locale
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Get device locale
const getDeviceLocale = (): string => {
  try {
    let locale = 'en';
    if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
               NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
               'en';
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
    return locale.split('_')[0].split('-')[0];
  } catch {
    return 'en';
  }
};

// Initialize locale from storage or device
export const initializeLocale = async (): Promise<string> => {
  try {
    const savedLocale = await AsyncStorage.getItem('app_locale');
    if (savedLocale) {
      i18n.locale = savedLocale;
      return savedLocale;
    }
    
    const deviceLocale = getDeviceLocale();
    const supportedLocale = ['en', 'es'].includes(deviceLocale) ? deviceLocale : 'en';
    i18n.locale = supportedLocale;
    return supportedLocale;
  } catch {
    i18n.locale = 'en';
    return 'en';
  }
};

// Change locale
export const setLocale = async (locale: string): Promise<void> => {
  i18n.locale = locale;
  await AsyncStorage.setItem('app_locale', locale);
};

// Get current locale
export const getLocale = (): string => i18n.locale;

// Translation function
export const t = (key: string, options?: object): string => {
  return i18n.t(key, options);
};

export default i18n;
