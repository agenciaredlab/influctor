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
  console.log('Seeding complete!')
  console.log('\nDemo user created:')
  console.log('Email: demo@influctor.app')
  console.log('ID:', user.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
