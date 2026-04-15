import { PrismaClient } from '@prisma/client'
import { subDays, subMonths, startOfMonth } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@influctor.app' },
    update: {},
    create: {
      email: 'demo@influctor.app',
      name: 'Alex Creator',
      bio: 'Content creator & digital entrepreneur. Compartiendo mi journey de 0 a 1M de seguidores.',
    },
  })

  console.log('Created user:', user.id)

  // Seed Goals
  const goals = [
    {
      title: 'Llegar a 100K seguidores en Instagram',
      category: 'followers',
      platform: 'instagram',
      targetValue: 100000,
      currentValue: 67450,
      unit: 'seguidores',
      status: 'active',
      priority: 'high',
      score: 67.5,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Alcanzar 5% de engagement rate',
      category: 'engagement',
      platform: 'instagram',
      targetValue: 5,
      currentValue: 3.8,
      unit: '%',
      status: 'active',
      priority: 'high',
      score: 76,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Generar $5,000 USD/mes',
      category: 'income',
      platform: 'all',
      targetValue: 5000,
      currentValue: 3200,
      unit: 'USD',
      status: 'active',
      priority: 'high',
      score: 64,
      deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Publicar 30 videos en TikTok',
      category: 'content',
      platform: 'tiktok',
      targetValue: 30,
      currentValue: 22,
      unit: 'videos',
      status: 'active',
      priority: 'medium',
      score: 73.3,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: '1M de vistas en YouTube',
      category: 'views',
      platform: 'youtube',
      targetValue: 1000000,
      currentValue: 840000,
      unit: 'vistas',
      status: 'active',
      priority: 'medium',
      score: 84,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      title: '10 colaboraciones con marcas',
      category: 'brand_deals',
      platform: 'all',
      targetValue: 10,
      currentValue: 10,
      unit: 'deals',
      status: 'completed',
      priority: 'high',
      score: 100,
    },
  ]

  for (const goal of goals) {
    await prisma.goal.create({ data: { ...goal, userId: user.id } })
  }

  console.log('Created goals')

  // Seed Campaigns
  const campaigns = [
    {
      name: 'Lanzamiento Colección Verano',
      description: 'Campaña de awareness para nueva colección de ropa',
      objective: 'awareness',
      platform: 'instagram',
      budget: 2000,
      spent: 1450,
      startDate: subDays(new Date(), 15),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'active',
      impressions: 124500,
      reach: 89300,
      engagement: 4230,
      conversions: 342,
      clicks: 1890,
      tags: 'moda,verano,collab',
    },
    {
      name: 'Growth TikTok Q1',
      description: 'Estrategia de crecimiento orgánico en TikTok',
      objective: 'growth',
      platform: 'tiktok',
      budget: 0,
      spent: 0,
      startDate: startOfMonth(new Date()),
      status: 'active',
      impressions: 567000,
      reach: 423000,
      engagement: 18900,
      conversions: 1240,
      clicks: 3420,
      tags: 'organico,growth,tiktok',
    },
    {
      name: 'Afiliados Herramientas Tech',
      description: 'Promoción de herramientas de productividad para creadores',
      objective: 'monetization',
      platform: 'youtube',
      budget: 500,
      spent: 500,
      startDate: subMonths(new Date(), 1),
      endDate: subDays(new Date(), 5),
      status: 'completed',
      impressions: 45200,
      reach: 38900,
      engagement: 2100,
      conversions: 189,
      clicks: 1230,
      tags: 'afiliados,tech,youtube',
    },
    {
      name: 'LinkedIn Thought Leadership',
      description: 'Posicionamiento como experto en marketing digital',
      objective: 'engagement',
      platform: 'linkedin',
      budget: 300,
      spent: 120,
      startDate: subDays(new Date(), 7),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
      status: 'active',
      impressions: 12400,
      reach: 9800,
      engagement: 876,
      conversions: 45,
      clicks: 234,
      tags: 'linkedin,b2b,thought-leadership',
    },
    {
      name: 'Newsletter Launch',
      description: 'Lanzamiento de newsletter de estrategias para creadores',
      objective: 'conversion',
      platform: 'multi',
      budget: 1000,
      spent: 0,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'draft',
      impressions: 0,
      reach: 0,
      engagement: 0,
      conversions: 0,
      clicks: 0,
      tags: 'newsletter,email,launch',
    },
  ]

  for (const campaign of campaigns) {
    await prisma.campaign.create({ data: { ...campaign, userId: user.id } })
  }

  console.log('Created campaigns')

  // Seed Income entries (last 6 months)
  const incomes = [
    // This month
    { amount: 1500, source: 'brand_deal', platform: 'instagram', description: 'Campaña Nike Running', date: subDays(new Date(), 2) },
    { amount: 450, source: 'affiliate', platform: 'youtube', description: 'Comisiones Amazon afiliados', date: subDays(new Date(), 5) },
    { amount: 320, source: 'adsense', platform: 'youtube', description: 'AdSense YouTube - Marzo', date: subDays(new Date(), 8) },
    { amount: 200, source: 'tips', platform: 'instagram', description: 'Tips/Badges Lives', date: subDays(new Date(), 3) },
    // Last month
    { amount: 2000, source: 'brand_deal', platform: 'tiktok', description: 'Deal Sephora #ad', date: subDays(new Date(), 32) },
    { amount: 380, source: 'affiliate', platform: 'youtube', description: 'Afiliados Febrero', date: subDays(new Date(), 28) },
    { amount: 290, source: 'adsense', platform: 'youtube', description: 'AdSense - Febrero', date: subDays(new Date(), 35) },
    { amount: 500, source: 'consulting', platform: undefined, description: 'Consultoría estrategia IG', date: subDays(new Date(), 40) },
    // 2 months ago
    { amount: 1200, source: 'brand_deal', platform: 'instagram', description: 'Campaña Zara Fashion', date: subDays(new Date(), 55) },
    { amount: 310, source: 'affiliate', platform: 'youtube', description: 'Afiliados Enero', date: subDays(new Date(), 60) },
    { amount: 245, source: 'adsense', platform: 'youtube', description: 'AdSense - Enero', date: subDays(new Date(), 62) },
    { amount: 180, source: 'merch', platform: undefined, description: 'Venta merch online', date: subDays(new Date(), 50) },
    // 3 months ago
    { amount: 800, source: 'brand_deal', platform: 'instagram', description: 'Deal Adidas', date: subDays(new Date(), 85) },
    { amount: 290, source: 'affiliate', platform: 'youtube', description: 'Afiliados Diciembre', date: subDays(new Date(), 90) },
    { amount: 210, source: 'adsense', platform: 'youtube', description: 'AdSense - Diciembre', date: subDays(new Date(), 92) },
    // 4 months ago
    { amount: 600, source: 'brand_deal', platform: 'tiktok', description: 'Colaboración H&M', date: subDays(new Date(), 115) },
    { amount: 180, source: 'affiliate', platform: 'youtube', description: 'Afiliados Noviembre', date: subDays(new Date(), 120) },
    { amount: 195, source: 'adsense', platform: 'youtube', description: 'AdSense - Noviembre', date: subDays(new Date(), 122) },
    // 5 months ago
    { amount: 400, source: 'brand_deal', platform: 'instagram', description: 'Deal Shopify', date: subDays(new Date(), 145) },
    { amount: 140, source: 'affiliate', platform: 'youtube', description: 'Afiliados Octubre', date: subDays(new Date(), 150) },
    { amount: 170, source: 'adsense', platform: 'youtube', description: 'AdSense - Octubre', date: subDays(new Date(), 152) },
  ]

  for (const income of incomes) {
    await prisma.income.create({
      data: {
        ...income,
        platform: income.platform ?? null,
        currency: 'USD',
        paid: true,
        userId: user.id,
      },
    })
  }

  console.log('Created income entries')

  // Seed Social Metrics (last 6 months, weekly snapshots)
  const platforms = ['instagram', 'tiktok', 'youtube']
  const metricsBase = {
    instagram: { followers: 45000, posts: 180, engagement: 2.8 },
    tiktok: { followers: 28000, posts: 95, engagement: 5.2 },
    youtube: { followers: 12000, posts: 45, engagement: 3.1 },
  }

  for (let week = 24; week >= 0; week--) {
    const date = subDays(new Date(), week * 7)
    const growthFactor = (24 - week) / 24

    for (const platform of platforms) {
      const base = metricsBase[platform as keyof typeof metricsBase]
      const followers = Math.round(base.followers * (0.4 + 0.6 * growthFactor) + Math.random() * 500)
      const engagement = parseFloat((base.engagement * (0.8 + 0.4 * growthFactor)).toFixed(2))

      await prisma.socialMetric.create({
        data: {
          platform,
          followers,
          following: Math.round(followers * 0.1),
          posts: Math.round(base.posts * (0.3 + 0.7 * growthFactor)),
          engagement,
          reach: Math.round(followers * 0.15),
          impressions: Math.round(followers * 0.25),
          views: platform === 'youtube' ? Math.round(followers * 15) : Math.round(followers * 5),
          likes: Math.round(followers * 0.05),
          comments: Math.round(followers * 0.008),
          shares: Math.round(followers * 0.003),
          date,
          userId: user.id,
        },
      })
    }
  }

  console.log('Created social metrics')

  // ── Marketplace Listings ──────────────────────────────────────────────────
  const listings = [
    {
      title: 'Buscamos creador fitness para lanzamiento de suplementos',
      brandName: 'NutriFit Pro',
      budget: 1500, budgetType: 'fixed', currency: 'USD',
      type: 'reel', platforms: 'instagram,tiktok',
      niche: 'Fitness', location: 'España / LATAM',
      description: 'Lanzamos nuestra nueva línea de proteínas plant-based y buscamos un creador de contenido fitness con audiencia activa. Necesitamos autenticidad: queremos que lo pruebes de verdad y compartas tu experiencia.',
      deliverables: JSON.stringify(['2 Reels (1 Instagram + 1 TikTok)', '5 Stories con link a tienda', 'Mención en bio por 30 días']),
      requirements: 'Mínimo 15K seguidores, engagement >3.5%, nicho fitness/nutrición',
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: 'open', featured: true, applicantsCount: 14,
    },
    {
      title: 'Embajador/a de marca — herramienta de productividad IA',
      brandName: 'TaskFlow AI',
      budget: 800, budgetMax: 1200, budgetType: 'range', currency: 'USD',
      type: 'ambassador', platforms: 'instagram,youtube,linkedin',
      niche: 'Negocios', location: 'Global (español)',
      description: 'Somos una startup de productividad con IA. Buscamos creadores del nicho de negocios, emprendimiento o productividad que usen nuestra herramienta y la recomienden de forma orgánica.',
      deliverables: JSON.stringify(['4 posts mensuales', '1 video tutorial YouTube', 'Código de descuento exclusivo para audiencia']),
      requirements: '20K+ seguidores, nicho business/productividad, engagement real',
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'open', featured: true, applicantsCount: 8,
    },
    {
      title: 'UGC para campaña de moda sostenible — sin publicación requerida',
      brandName: 'EcoWear Studio',
      budget: 400, budgetType: 'fixed', currency: 'USD',
      type: 'ugc', platforms: 'instagram',
      niche: 'Moda', location: 'España',
      description: 'Buscamos creadores UGC para producir contenido fotográfico y de video de nuestra colección primavera. El contenido será usado en nuestras redes y ads. No necesitas publicarlo en tu cuenta.',
      deliverables: JSON.stringify(['6 fotos lifestyle HD', '2 videos cortos 15-30s', 'Derechos de uso por 6 meses']),
      requirements: 'Experiencia en fotografía/video, estética limpia, nicho moda o lifestyle',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'open', featured: false, applicantsCount: 22,
    },
    {
      title: 'Creador de gaming para review de periféricos',
      brandName: 'GearZone',
      budget: 600, budgetType: 'fixed', currency: 'USD',
      type: 'video', platforms: 'youtube,tiktok',
      niche: 'Gaming', location: 'LATAM',
      description: 'Marca de periféricos gaming busca creadores para review honesto de nuestro nuevo headset y mouse. Enviamos el producto + compensación económica.',
      deliverables: JSON.stringify(['1 video review YouTube (+8 min)', '1 Short/TikTok resumen', 'Pinned comment con link de compra']),
      requirements: '5K+ suscriptores YouTube o 10K TikTok, nicho gaming',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'open', featured: false, applicantsCount: 31,
    },
    {
      title: 'Serie de contenido educativo — finanzas personales',
      brandName: 'InverFácil',
      budget: 2500, budgetType: 'fixed', currency: 'USD',
      type: 'series', platforms: 'instagram,tiktok',
      niche: 'Finanzas', location: 'México / España',
      description: 'App de inversiones busca creador experto en finanzas personales para una serie de 6 videos explicando conceptos básicos de inversión. Buscamos tono didáctico y cercano.',
      deliverables: JSON.stringify(['6 Reels/TikToks (serie completa)', '6 carruseles complementarios', 'Briefing y revisión incluida']),
      requirements: '30K+ seguidores, nicho finanzas/economía, perfil verificado o reconocido',
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'open', featured: true, applicantsCount: 5,
    },
    {
      title: 'Afiliado para software de diseño — comisión recurrente',
      brandName: 'DesignPro',
      budget: 0, budgetType: 'negotiable', currency: 'USD',
      type: 'affiliate', platforms: 'instagram,youtube,tiktok',
      niche: 'Diseño', location: 'Global (español)',
      description: 'Ofrecemos 30% de comisión recurrente mensual por cada suscripción activa que traigas. Programa de afiliados de alto ticket para creadores con audiencia de diseñadores o creativos.',
      deliverables: JSON.stringify(['Integración orgánica en contenido existente', 'Link de afiliado personalizado', 'Reporte mensual de conversiones']),
      requirements: 'Audiencia de diseñadores, creativos o freelancers. Sin mínimo de seguidores.',
      deadline: undefined,
      status: 'open', featured: false, applicantsCount: 18,
    },
    {
      title: 'Lanzamiento app de meditación — micro-influencers',
      brandName: 'Sereno App',
      budget: 300, budgetMax: 500, budgetType: 'range', currency: 'USD',
      type: 'reel', platforms: 'instagram',
      niche: 'Bienestar', location: 'España / LATAM',
      description: 'App de meditación y mindfulness busca 10 micro-influencers del nicho wellness para campaña coordinada. Valoramos la autenticidad y conexión real con la audiencia.',
      deliverables: JSON.stringify(['1 Reel con experiencia personal', '3 Stories + link', '1 Story de seguimiento a la semana']),
      requirements: '3K–30K seguidores, engagement >4%, nicho bienestar/salud/mindfulness',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'open', featured: false, applicantsCount: 47,
    },
    {
      title: 'Post patrocinado — nueva línea de skincare coreano',
      brandName: 'K-Glow Beauty',
      budget: 900, budgetType: 'fixed', currency: 'USD',
      type: 'sponsored_post', platforms: 'instagram',
      niche: 'Belleza', location: 'España',
      description: 'Marca de cosmética coreana busca creadores del nicho belleza para presentar su nueva línea de hidratación. Enviamos producto completo + fee.',
      deliverables: JSON.stringify(['1 post en feed (foto o carrusel)', '3 Stories el día del lanzamiento', 'Contenido en línea mínimo 45 días']),
      requirements: '10K+ seguidores Instagram, nicho belleza/skincare, perfil estético cuidado',
      deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      status: 'open', featured: false, applicantsCount: 29,
    },
  ]

  // Delete existing and re-seed
  await prisma.marketplaceListing.deleteMany({})
  await prisma.marketplaceListing.createMany({ data: listings })
  console.log(`Created ${listings.length} marketplace listings`)

  // ── Influencer Profiles ──────────────────────────────────────────────────
  const influencers = [
    { name: 'Sofia Vega', handle: '@sofiavega.fit', platform: 'instagram', niche: 'Fitness', followers: 128000, engagement: 5.2, avgViews: 42000, location: 'Madrid, ES', estimatedRate: 800, verified: true, topics: 'fitness,nutrición,lifestyle', recentGrowth: '+2.1K/sem', bio: 'Entrenadora personal & nutricionista. Transformaciones reales.' },
    { name: 'Carlos Builds', handle: '@carlosbuilds', platform: 'tiktok', niche: 'Negocios', followers: 89000, engagement: 8.4, avgViews: 95000, location: 'México DF', estimatedRate: 600, verified: false, topics: 'emprendimiento,dropshipping,ecommerce', recentGrowth: '+5.3K/sem', bio: 'Emprendedor digital. Construyo negocios online desde 0.' },
    { name: 'Elena Cooks', handle: '@elenacooks_es', platform: 'instagram', niche: 'Gastronomía', followers: 312000, engagement: 3.8, avgViews: 68000, location: 'Barcelona, ES', estimatedRate: 2200, verified: true, topics: 'cocina,recetas,food', recentGrowth: '+4.1K/sem', bio: 'Chef profesional. Recetas fáciles para el día a día.' },
    { name: 'David Tech', handle: '@davidtech_ia', platform: 'youtube', niche: 'Tecnología', followers: 245000, engagement: 4.1, avgViews: 87000, location: 'Buenos Aires, AR', estimatedRate: 1800, verified: true, topics: 'IA,tech,productividad', recentGrowth: '+3.8K/sem', bio: 'Exploro el futuro de la tecnología y la IA.' },
    { name: 'Luna Moda', handle: '@lunamoda_style', platform: 'instagram', niche: 'Moda', followers: 67000, engagement: 6.9, avgViews: 28000, location: 'Colombia', estimatedRate: 450, verified: false, topics: 'moda,outfit,tendencias', recentGrowth: '+1.9K/sem', bio: 'Fashion creator. Looks para cada ocasión y presupuesto.' },
    { name: 'Alex Finance', handle: '@alexfinancemx', platform: 'tiktok', niche: 'Finanzas', followers: 445000, engagement: 7.2, avgViews: 180000, location: 'México', estimatedRate: 3500, verified: true, topics: 'inversiones,ahorro,crypto', recentGrowth: '+12K/sem', bio: 'Finanzas personales sin complicaciones para millenials.' },
    { name: 'Marco Wellness', handle: '@marcowellness', platform: 'instagram', niche: 'Bienestar', followers: 54000, engagement: 6.1, avgViews: 22000, location: 'Chile', estimatedRate: 350, verified: false, topics: 'mindfulness,meditación,bienestar', recentGrowth: '+1.2K/sem', bio: 'Psicólogo y coach de bienestar mental.' },
    { name: 'Valeria Eats', handle: '@valeriaeats', platform: 'tiktok', niche: 'Gastronomía', followers: 198000, engagement: 9.3, avgViews: 320000, location: 'Madrid, ES', estimatedRate: 1400, verified: true, topics: 'recetas,foodie,restaurantes', recentGrowth: '+8.7K/sem', bio: 'Foodie profesional. Si tiene buena pinta, lo pruebo.' },
    { name: 'Rodrigo Dev', handle: '@rodrigodev', platform: 'youtube', niche: 'Tecnología', followers: 78000, engagement: 5.5, avgViews: 41000, location: 'Colombia', estimatedRate: 700, verified: false, topics: 'programación,web,startup', recentGrowth: '+2.4K/sem', bio: 'Desarrollador full-stack. Enseño a programar desde cero.' },
    { name: 'Camila Travel', handle: '@camila.travel', platform: 'instagram', niche: 'Travel', followers: 156000, engagement: 4.7, avgViews: 54000, location: 'Argentina', estimatedRate: 1100, verified: true, topics: 'viajes,fotografía,adventure', recentGrowth: '+3.1K/sem', bio: 'Viajera profesional. 40 países y contando.' },
    { name: 'Nico Gaming', handle: '@nicogaming_es', platform: 'tiktok', niche: 'Gaming', followers: 234000, engagement: 11.2, avgViews: 480000, location: 'España', estimatedRate: 1600, verified: true, topics: 'gaming,esports,streaming', recentGrowth: '+15K/sem', bio: 'Pro gamer & streamer. Clips, humor y competitivo.' },
    { name: 'Diana Skincare', handle: '@diana.skincare', platform: 'instagram', niche: 'Belleza', followers: 91000, engagement: 5.8, avgViews: 38000, location: 'México', estimatedRate: 650, verified: false, topics: 'skincare,belleza,rutinas', recentGrowth: '+2.8K/sem', bio: 'Cosmetóloga. Rutinas de skincare sin mentiras.' },
  ]

  await prisma.influencerProfile.deleteMany({})
  await prisma.influencerProfile.createMany({ data: influencers })
  console.log(`Created ${influencers.length} influencer profiles`)

  console.log('Seeding complete!')
  console.log('\nDemo user created:')
  console.log('Email: demo@influctor.app')
  console.log('ID:', user.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
