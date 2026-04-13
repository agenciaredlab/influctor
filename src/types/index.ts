export interface Goal {
  id: string
  title: string
  description?: string | null
  category: string
  platform?: string | null
  targetValue: number
  currentValue: number
  unit: string
  deadline?: Date | string | null
  status: string
  priority: string
  score?: number | null
  notes?: string | null
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Campaign {
  id: string
  name: string
  description?: string | null
  objective: string
  platform: string
  budget: number
  spent: number
  startDate: Date | string
  endDate?: Date | string | null
  status: string
  impressions: number
  reach: number
  engagement: number
  conversions: number
  clicks: number
  content?: string | null
  tags?: string | null
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Income {
  id: string
  amount: number
  currency: string
  source: string
  platform?: string | null
  description?: string | null
  date: Date | string
  invoiced: boolean
  paid: boolean
  userId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface SocialMetric {
  id: string
  platform: string
  followers: number
  following: number
  posts: number
  engagement: number
  reach: number
  impressions: number
  views: number
  likes: number
  comments: number
  shares: number
  date: Date | string
  userId: string
}

export interface AiUsage {
  id: string
  type: string
  prompt: string
  result: string
  platform?: string | null
  saved: boolean
  userId: string
  createdAt: Date | string
}

export interface DashboardStats {
  totalFollowers: number
  followerGrowth: number
  avgEngagement: number
  engagementChange: number
  monthlyIncome: number
  incomeChange: number
  activeCampaigns: number
  goalsCompleted: number
  totalGoals: number
}

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'all' | 'multi'
export type GoalCategory = 'followers' | 'engagement' | 'income' | 'content' | 'views' | 'brand_deals'
export type CampaignObjective = 'awareness' | 'engagement' | 'conversion' | 'growth' | 'monetization'
export type IncomeSource = 'brand_deal' | 'affiliate' | 'adsense' | 'merch' | 'tips' | 'subscription' | 'consulting' | 'other'
export type StatusType = 'active' | 'completed' | 'paused' | 'draft' | 'failed' | 'cancelled'
export type PriorityType = 'low' | 'medium' | 'high'
export type AiGenerationType = 'caption' | 'hashtags' | 'bio' | 'content_ideas' | 'strategy' | 'analysis'
