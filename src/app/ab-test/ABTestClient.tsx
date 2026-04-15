'use client'

import { useState } from 'react'
import { SplitSquareVertical, Sparkles, RefreshCw, Copy, CheckCheck, ThumbsUp, ThumbsDown, BarChart2, Zap, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const CAPTION_TONES = [
  { id: 'casual', label: '😊 Casual', desc: 'Amigable y cercano' },
  { id: 'professional', label: '💼 Profesional', desc: 'Formal y autoridad' },
  { id: 'humor', label: '😂 Con humor', desc: 'Divertido y memorable' },
  { id: 'emotional', label: '💙 Emocional', desc: 'Toca fibras sensibles' },
  { id: 'urgency', label: '⚡ Urgencia', desc: 'FOMO y llamada a acción' },
  { id: 'educational', label: '🎓 Educativo', desc: 'Aporta valor directo' },
]

const SCORE_LABELS = ['Claridad', 'Hook', 'CTA', 'Engagement', 'Longitud']

interface Caption {
  id: string
  text: string
  tone: string
  scores: Record<string, number>
  totalScore: number
  votes: number
}

interface TestResult {
  winner: string
  captions: Caption[]
  analysis: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors">
      {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className={cn('font-medium', score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400')}>{score}</span>
      </div>
      <div className="h-1 bg-[#0d0d1a] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function avg(scores: Record<string, number>) {
  const vals = Object.values(scores)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export default function ABTestClient() {
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [toneA, setToneA] = useState('casual')
  const [toneB, setToneB] = useState('urgency')
  const [loading, setLoading] = useState(false)
  const [loadingManual, setLoadingManual] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [error, setError] = useState('')
  const [voted, setVoted] = useState<string | null>(null)
  const [manualA, setManualA] = useState('')
  const [manualB, setManualB] = useState('')
  const [mode, setMode] = useState<'generate' | 'manual'>('generate')

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setTestResult(null)
    setVoted(null)

    const toneALabel = CAPTION_TONES.find(t => t.id === toneA)?.label || toneA
    const toneBLabel = CAPTION_TONES.find(t => t.id === toneB)?.label || toneB

    try {
      const res = await fetch('/api/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', topic, toneA: toneALabel, toneB: toneBLabel, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      const scoresA = data.captionA?.scores ?? {}
      const scoresB = data.captionB?.scores ?? {}

      const captions: Caption[] = [
        { id: 'A', text: data.captionA?.text ?? '', tone: toneA, scores: scoresA, totalScore: avg(scoresA), votes: 0 },
        { id: 'B', text: data.captionB?.text ?? '', tone: toneB, scores: scoresB, totalScore: avg(scoresB), votes: 0 },
      ]

      setTestResult({
        winner: data.winner ?? (captions[0].totalScore >= captions[1].totalScore ? 'A' : 'B'),
        captions,
        analysis: data.analysis ?? '',
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function analyzeManual() {
    if (!manualA.trim() || !manualB.trim()) return
    setLoadingManual(true)
    setError('')
    setTestResult(null)
    setVoted(null)

    try {
      const res = await fetch('/api/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze', captionA: manualA, captionB: manualB, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      const scoresA = data.captionA?.scores ?? {}
      const scoresB = data.captionB?.scores ?? {}

      const captions: Caption[] = [
        { id: 'A', text: manualA, tone: 'custom', scores: scoresA, totalScore: avg(scoresA), votes: 0 },
        { id: 'B', text: manualB, tone: 'custom', scores: scoresB, totalScore: avg(scoresB), votes: 0 },
      ]
      setTestResult({
        winner: data.winner ?? (captions[0].totalScore >= captions[1].totalScore ? 'A' : 'B'),
        captions,
        analysis: data.analysis ?? '',
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingManual(false)
    }
  }

  function vote(captionId: string) {
    setVoted(captionId)
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['generate', 'manual'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              mode === m ? 'bg-violet-600 text-white' : 'bg-[#13131f] border border-[#1a1a2e] text-gray-400 hover:text-gray-200'
            )}
          >
            {m === 'generate' ? '✨ Generar con IA' : '✏️ Comparar mis captions'}
          </button>
        ))}
      </div>

      {mode === 'generate' ? (
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <SplitSquareVertical size={14} className="text-violet-400" />
            Configurar test A/B
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs text-gray-400 mb-1 block">Tema del post</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="ej: Lanzamiento de mi nuevo curso online sobre finanzas"
                rows={3}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Tono A</label>
              <div className="space-y-1.5">
                {CAPTION_TONES.map(tone => (
                  <button key={tone.id} onClick={() => setToneA(tone.id)} className={cn('w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors', toneA === tone.id ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-[#0d0d1a] border border-[#1a1a2e] text-gray-400 hover:text-gray-200')}>
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Tono B</label>
              <div className="space-y-1.5">
                {CAPTION_TONES.map(tone => (
                  <button key={tone.id} onClick={() => setToneB(tone.id)} className={cn('w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors', toneB === tone.id ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-[#0d0d1a] border border-[#1a1a2e] text-gray-400 hover:text-gray-200')}>
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
              {['instagram', 'tiktok', 'linkedin', 'facebook'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <button onClick={generate} disabled={loading || !topic.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Generando A/B...</> : <><Sparkles size={14} /> Generar Test</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-sm">Compara tus propios captions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Caption A</label>
              <textarea value={manualA} onChange={e => setManualA(e.target.value)} placeholder="Pega aquí tu primera versión..." rows={5} className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Caption B</label>
              <textarea value={manualB} onChange={e => setManualB(e.target.value)} placeholder="Pega aquí tu segunda versión..." rows={5} className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
            </div>
          </div>
          <button onClick={analyzeManual} disabled={loadingManual || !manualA.trim() || !manualB.trim()} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loadingManual ? <><RefreshCw size={14} className="animate-spin" /> Analizando...</> : <><BarChart2 size={14} /> Analizar y comparar</>}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {testResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              Resultado del test
            </h3>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              <span className="text-xs text-amber-400 font-medium">Versión {testResult.winner} gana según análisis IA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResult.captions.map(caption => (
              <div
                key={caption.id}
                className={cn(
                  'bg-[#13131f] border rounded-xl p-4 space-y-3 transition-all',
                  testResult.winner === caption.id ? 'border-amber-500/30 shadow-lg shadow-amber-900/10' : 'border-[#1a1a2e]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold', testResult.winner === caption.id ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300')}>
                      {caption.id}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">Versión {caption.id}</div>
                      <div className="text-[10px] text-gray-500">{CAPTION_TONES.find(t => t.id === caption.tone)?.label || 'Custom'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn('text-sm font-bold', caption.totalScore >= 75 ? 'text-emerald-400' : caption.totalScore >= 60 ? 'text-amber-400' : 'text-red-400')}>
                      {caption.totalScore}/100
                    </div>
                    {testResult.winner === caption.id && <Trophy size={14} className="text-amber-400" />}
                  </div>
                </div>

                <div className="bg-[#0d0d1a] rounded-lg p-3 text-xs text-gray-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {caption.text}
                </div>

                <div className="space-y-1.5">
                  {SCORE_LABELS.map(label => (
                    <ScoreBar key={label} label={label} score={caption.scores[label]} />
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <CopyButton text={caption.text} />
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => vote(caption.id)} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors', voted === caption.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400')}>
                      <ThumbsUp size={11} /> {voted === caption.id ? 'Votado' : 'Votar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Analysis */}
          {testResult.analysis && (
            <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/20 rounded-xl p-4">
              <h4 className="font-semibold text-violet-300 text-sm mb-3 flex items-center gap-2">
                <Zap size={13} /> Análisis IA
              </h4>
              <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{testResult.analysis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
