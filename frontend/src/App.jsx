import { useMemo, useRef, useState } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const inputRef = useRef(null)

  const baseFileName = useMemo(() => {
    if (!file?.name) return 'audio-brief-result'
    const lastDotIndex = file.name.lastIndexOf('.')
    return lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name
  }, [file])

  const downloadFileName = `${baseFileName}.txt`

  const getStatusLabel = () => {
    switch (status) {
      case 'QUEUED':
        return '대기 중'
      case 'UPLOADING':
        return '업로드 중'
      case 'TRANSCRIBING':
        return '전사 중'
      case 'SUMMARIZING':
        return '요약 중'
      case 'COMPLETED':
        return '완료'
      case 'FAILED':
        return '오류'
      default:
        return '대기'
    }
  }

  const getStatusClassName = () => {
    switch (status) {
      case 'QUEUED':
      case 'UPLOADING':
      case 'TRANSCRIBING':
      case 'SUMMARIZING':
        return 'bg-amber-100 text-amber-700'
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700'
      case 'FAILED':
        return 'bg-rose-100 text-rose-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const handleSelectFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setJobId(null)
    setTranscription('')
    setSummary('')
    setProgress(0)
    setStatus('idle')
    setErrorMessage('')
  }

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택하세요.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      setLoading(true)
      setStatus('UPLOADING')
      setProgress(0)
      setErrorMessage('')
      setTranscription('')
      setSummary('')

      const res = await fetch('http://localhost:8080/api/jobs', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()

      if (!res.ok) {
        setLoading(false)
        setStatus('FAILED')
        setErrorMessage(text)
        alert(`업로드 실패: ${text}`)
        return
      }

      const data = JSON.parse(text)
      setJobId(data.jobId)
      setStatus(data.status || 'QUEUED')
      setProgress(data.progress ?? 0)

      pollJob(data.jobId)
    } catch (err) {
      console.error(err)
      setLoading(false)
      setStatus('FAILED')
      setErrorMessage(err.message)
      alert(`에러 발생: ${err.message}`)
    }
  }

  const pollJob = (createdJobId) => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/jobs/${createdJobId}`)
        const text = await res.text()

        if (!res.ok) {
          clearInterval(intervalId)
          setLoading(false)
          setStatus('FAILED')
          setErrorMessage(text)
          alert(`상태 조회 실패: ${text}`)
          return
        }

        const job = JSON.parse(text)

        setJobId(job.jobId)
        setStatus(job.status || 'idle')
        setProgress(job.progress ?? 0)
        setErrorMessage(job.errorMessage || '')

        if (job.status === 'COMPLETED') {
          setTranscription(job.transcription || '')
          setSummary(job.summary || '')
          setLoading(false)
          clearInterval(intervalId)
        }

        if (job.status === 'FAILED') {
          setLoading(false)
          clearInterval(intervalId)
          alert(`처리 실패: ${job.errorMessage || '알 수 없는 오류'}`)
        }
      } catch (err) {
        console.error(err)
        setLoading(false)
        setStatus('FAILED')
        setErrorMessage(err.message)
        clearInterval(intervalId)
        alert(`상태 조회 중 오류: ${err.message}`)
      }
    }, 2000)
  }

  const handleDownloadTxt = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/download/txt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: downloadFileName,
          sourceFileName: file?.name ?? '',
          transcription,
          summary,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        alert(`다운로드 에러: ${errorText}`)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = downloadFileName
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert(`다운로드 실패: ${err.message}`)
    }
  }

  const handleCopy = async (text, label) => {
    if (!text) {
      alert(`${label} 내용이 없습니다.`)
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      alert(`${label} 복사 완료`)
    } catch (err) {
      console.error(err)
      alert(`${label} 복사 실패`)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)

    const droppedFile = e.dataTransfer.files?.[0]
    handleSelectFile(droppedFile)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
              AI audio transcription & summary
            </div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">
              Audio Brief
            </h1>
            <p className="mt-3 text-base text-slate-600">
              음성 파일을 업로드하면 전사하고, 요약하고, txt로 내려받을 수 있습니다.
            </p>
          </div>

          <div className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${getStatusClassName()}`}>
            상태: {getStatusLabel()}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-xl font-semibold text-slate-900">업로드</h2>
            <p className="mt-2 text-sm text-slate-500">
              mp3, m4a 등 오디오 파일을 선택하거나 드래그해서 놓으세요.
            </p>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center transition ${
                dragActive
                  ? 'border-slate-500 bg-slate-100'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm font-medium text-slate-700">파일 업로드</div>
              <div className="mt-2 text-xs text-slate-500">
                클릭 또는 드래그앤드롭
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0])}
              />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {file ? (
                <>
                  <div className="font-medium text-slate-900">선택된 파일</div>
                  <div className="mt-1 break-all">{file.name}</div>
                </>
              ) : (
                '선택된 파일이 없습니다.'
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>진행 상태</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-slate-900 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {getStatusLabel()}
                {jobId ? ` · jobId: ${jobId}` : ''}
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleUpload}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? '처리 중...' : '전사 + 요약하기'}
              </button>

              <button
                onClick={handleDownloadTxt}
                disabled={!transcription && !summary}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                txt 다운로드
              </button>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              <div>
                <div>다운로드 파일명</div>
                <div className="mt-1 break-all font-medium text-slate-700">
                  {downloadFileName}
                </div>
              </div>

              <div>
                <div>현재 상태</div>
                <div className="mt-1 font-medium text-slate-700">
                  {getStatusLabel()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">전사 결과</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    transcription
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(transcription, '전사 결과')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  복사
                </button>
              </div>

              <div className="mt-4 max-h-[320px] overflow-auto rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {transcription || '전사 결과가 여기에 표시됩니다.'}
                </pre>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">요약 결과</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    summary
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(summary, '요약 결과')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  복사
                </button>
              </div>

              <div className="mt-4 max-h-[280px] overflow-auto rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {summary || '요약 결과가 여기에 표시됩니다.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App