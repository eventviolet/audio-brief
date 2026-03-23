// React에서 사용할 훅들을 import 합니다.
// useState: 화면에서 바뀌는 값 저장
// useRef: DOM(input 같은 것)를 직접 가리킬 때 사용
// useMemo: 어떤 값을 필요할 때만 다시 계산
import { useMemo, useRef, useState } from 'react'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
function App() {
  // 사용자가 선택한 파일을 저장합니다.
  const [file, setFile] = useState(null)

  // 백엔드가 발급한 작업 ID를 저장합니다.
  const [jobId, setJobId] = useState(null)

  // 전사 결과 텍스트를 저장합니다.
  const [transcription, setTranscription] = useState('')

  // 요약 결과 텍스트를 저장합니다.
  const [summary, setSummary] = useState('')

  // 현재 작업 중인지 여부를 저장합니다.
  // true면 "처리 중..." 같은 UI를 보여줄 수 있습니다.
  const [loading, setLoading] = useState(false)

  // 현재 작업 상태를 저장합니다.
  // 예: idle, UPLOADING, QUEUED, TRANSCRIBING, SUMMARIZING, COMPLETED, FAILED
  const [status, setStatus] = useState('idle')

  // 진행률(퍼센트)을 저장합니다.
  const [progress, setProgress] = useState(0)

  // 에러 메시지를 저장합니다.
  const [errorMessage, setErrorMessage] = useState('')

  // 드래그 중인지 여부를 저장합니다.
  // 드래그 앤 드롭 영역의 스타일 변경에 사용합니다.
  const [dragActive, setDragActive] = useState(false)

  // 숨겨진 파일 input을 직접 클릭하기 위해 ref를 만듭니다.
  const inputRef = useRef(null)

  // 업로드한 파일 이름에서 확장자를 제거한 기본 파일명을 만듭니다.
  // 예: meeting.mp3 -> meeting
  const baseFileName = useMemo(() => {
    // 파일이 아직 없으면 기본 이름을 사용합니다.
    if (!file?.name) return 'audio-brief-result'

    // 파일명에서 마지막 "." 위치를 찾습니다.
    const lastDotIndex = file.name.lastIndexOf('.')

    // "."이 있으면 그 앞부분만 잘라서 반환합니다.
    // 없으면 파일명 전체를 그대로 반환합니다.
    return lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name
  }, [file])

  // 실제 다운로드할 파일명입니다.
  // 예: meeting.txt
  const downloadFileName = `${baseFileName}.txt`

  // 현재 status 값을 사람이 읽기 쉬운 한글 문구로 바꿔주는 함수입니다.
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

  // 현재 status 값에 따라 상태 배지 색상을 바꿔주는 함수입니다.
  const getStatusClassName = () => {
    switch (status) {
      case 'QUEUED':
      case 'UPLOADING':
      case 'TRANSCRIBING':
      case 'SUMMARIZING':
        // 진행 중일 때 노란색 계열
        return 'bg-amber-100 text-amber-700'
      case 'COMPLETED':
        // 완료일 때 초록색 계열
        return 'bg-emerald-100 text-emerald-700'
      case 'FAILED':
        // 실패일 때 빨간색 계열
        return 'bg-rose-100 text-rose-700'
      default:
        // 기본 상태는 회색 계열
        return 'bg-slate-100 text-slate-600'
    }
  }

  // 파일을 선택했을 때 공통 처리 함수입니다.
  const handleSelectFile = (selectedFile) => {
    // 파일이 없으면 아무 것도 하지 않습니다.
    if (!selectedFile) return

    // 새 파일을 상태에 저장합니다.
    setFile(selectedFile)

    // 이전 작업 정보들을 초기화합니다.
    setJobId(null)
    setTranscription('')
    setSummary('')
    setProgress(0)
    setStatus('idle')
    setErrorMessage('')
  }

  // 업로드 버튼을 눌렀을 때 실행되는 함수입니다.
  const handleUpload = async () => {
    // 파일이 선택되지 않았다면 업로드를 막습니다.
    if (!file) {
      alert('파일을 선택하세요.')
      return
    }

    // 브라우저에서 파일 업로드용 FormData 객체를 만듭니다.
    const formData = new FormData()

    // "file"이라는 키 이름으로 파일을 담습니다.
    formData.append('file', file)

    // 업로드 시작 전에 화면 상태를 정리합니다.
    setLoading(true)          // 로딩 시작
    setStatus('UPLOADING')    // 상태를 업로드 중으로 변경
    setProgress(0)            // 진행률 0으로 초기화
    setErrorMessage('')       // 이전 에러 제거
    setTranscription('')      // 이전 전사 결과 제거
    setSummary('')            // 이전 요약 결과 제거

    try {
      // 백엔드에 파일을 업로드합니다.
      const res = await fetch('${API_BASE_URL}/api/jobs', {
        method: 'POST',
        body: formData,
      })

      // 응답 본문을 일단 text로 받습니다.
      // 실패 시 서버가 일반 문자열 에러를 줄 수도 있어서 text가 유연합니다.
      const text = await res.text()

      // HTTP 응답이 실패라면
      if (!res.ok) {
        setLoading(false)
        setStatus('FAILED')
        setErrorMessage(text)
        alert(`업로드 실패: ${text}`)
        return
      }

      // 성공했다면 text를 JSON으로 변환합니다.
      const data = JSON.parse(text)

      // 백엔드가 준 작업 ID 저장
      setJobId(data.jobId)

      // 상태값 저장. 없으면 QUEUED 사용
      setStatus(data.status || 'QUEUED')

      // 진행률 저장. 없으면 0 사용
      setProgress(data.progress ?? 0)

      // 업로드 직후, 작업 상태를 주기적으로 조회하기 시작합니다.
      pollJob(data.jobId)
    } catch (err) {
      // 네트워크 오류 등 예외가 발생했을 때
      console.error(err)
      setLoading(false)
      setStatus('FAILED')
      setErrorMessage('서버 요청 중 오류가 발생했습니다.')
      alert('서버 요청 중 오류가 발생했습니다.')
    }
  }

  // 백엔드 작업 상태를 2초마다 조회하는 함수입니다.
  const pollJob = (createdJobId) => {
    // setInterval: 일정 시간마다 반복 실행
    const intervalId = setInterval(async () => {
      try {
        // jobId로 현재 작업 상태를 조회합니다.
        const res = await fetch(`${API_BASE_URL}/api/jobs/${createdJobId}`)

        // 응답 본문을 text로 받습니다.
        const text = await res.text()

        // 상태 조회 실패 시
        if (!res.ok) {
          // 반복 조회 중지
          clearInterval(intervalId)

          // 로딩 종료 및 실패 처리
          setLoading(false)
          setStatus('FAILED')
          setErrorMessage(text)

          alert(`상태 조회 실패: ${text}`)
          return
        }

        // 성공하면 JSON으로 변환합니다.
        const job = JSON.parse(text)

        // 최신 상태를 화면에 반영합니다.
        setJobId(job.jobId)
        setStatus(job.status || 'idle')
        setProgress(job.progress ?? 0)
        setErrorMessage(job.errorMessage || '')

        // 작업이 완료되면 결과 텍스트를 저장합니다.
        if (job.status === 'COMPLETED') {
          setTranscription(job.transcription || '')
          setSummary(job.summary || '')
          setLoading(false)

          // 완료되었으므로 더 이상 조회할 필요가 없습니다.
          clearInterval(intervalId)
        }

        // 작업이 실패하면 반복 조회를 멈춥니다.
        if (job.status === 'FAILED') {
          setLoading(false)
          clearInterval(intervalId)
          alert(`처리 실패: ${job.errorMessage || '알 수 없는 오류'}`)
        }
      } catch (err) {
        // 폴링 중 네트워크 오류가 나면 종료
        console.error(err)
        clearInterval(intervalId)
        setLoading(false)
        setStatus('FAILED')
        setErrorMessage('상태 조회 중 오류가 발생했습니다.')
      }
    }, 2000) // 2000ms = 2초마다 실행
  }

  // txt 다운로드 버튼 클릭 시 실행되는 함수입니다.
  const handleDownloadTxt = async () => {
    // 전사/요약 둘 다 없으면 다운로드할 내용이 없으므로 중단합니다.
    if (!transcription && !summary) {
      alert('다운로드할 내용이 없습니다.')
      return
    }

    try {
      // 백엔드에 txt 파일 생성을 요청합니다.
      const response = await fetch('${API_BASE_URL}/api/download/txt', {
        method: 'POST',
        headers: {
          // JSON 형식으로 보낸다는 의미입니다.
          'Content-Type': 'application/json',
        },
        // 백엔드에 필요한 데이터를 JSON 문자열로 보냅니다.
        body: JSON.stringify({
          fileName: downloadFileName,
          sourceFileName: file?.name ?? '',
          transcription,
          summary,
        }),
      })

      // 다운로드 API 실패 시
      if (!response.ok) {
        const text = await response.text()
        alert(`다운로드 실패: ${text}`)
        return
      }

      // 파일 데이터를 blob(바이너리 데이터)으로 받습니다.
      const blob = await response.blob()

      // blob 데이터를 브라우저에서 임시 URL로 만듭니다.
      const url = window.URL.createObjectURL(blob)

      // a 태그를 동적으로 만들어 다운로드를 실행합니다.
      const a = document.createElement('a')
      a.href = url
      a.download = downloadFileName

      // 문서에 붙였다가
      document.body.appendChild(a)

      // 강제로 클릭해서 다운로드를 시작하고
      a.click()

      // 다시 제거합니다.
      a.remove()

      // 임시 URL 메모리 정리
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('다운로드 중 오류가 발생했습니다.')
    }
  }

  // 텍스트를 클립보드에 복사하는 공통 함수입니다.
  const handleCopy = async (text, label) => {
    // 복사할 내용이 없으면 안내
    if (!text) {
      alert(`${label} 내용이 없습니다.`)
      return
    }

    try {
      // 브라우저 클립보드 API 사용
      await navigator.clipboard.writeText(text)
      alert(`${label} 복사 완료`)
    } catch (err) {
      console.error(err)
      alert(`${label} 복사 실패`)
    }
  }

  // 파일이 업로드 박스 위로 올라왔을 때 실행됩니다.
  const handleDragOver = (e) => {
    // 브라우저 기본 동작(파일 열기 등)을 막습니다.
    e.preventDefault()

    // 드래그 중임을 표시합니다.
    setDragActive(true)
  }

  // 드래그하던 파일이 박스 밖으로 나갔을 때 실행됩니다.
  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  // 파일을 실제로 드롭했을 때 실행됩니다.
  const handleDrop = (e) => {
    e.preventDefault()

    // 드래그 상태 해제
    setDragActive(false)

    // 여러 파일 중 첫 번째 파일만 꺼냅니다.
    const droppedFile = e.dataTransfer.files?.[0]

    // 공통 파일 선택 함수로 넘깁니다.
    handleSelectFile(droppedFile)
  }

  // 화면에 실제로 보이는 UI 부분입니다.
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        {/* 상단 제목 영역 */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Audio Brief
            </h1>
            <p className="mt-3 text-base text-slate-600">
              오디오 파일을 업로드하면 전사와 요약을 한 번에 처리합니다.
            </p>
          </div>

          {/* 현재 작업 상태 배지 */}
          <div
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${getStatusClassName()}`}
          >
            상태: {getStatusLabel()}
          </div>
        </div>

        {/* 메인 레이아웃: 왼쪽 업로드 카드 / 오른쪽 결과 카드 2개 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 왼쪽 카드 */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">업로드</h2>
            <p className="mt-2 text-sm text-slate-500">
              mp3, wav, m4a 파일을 드래그하거나 클릭해서 선택하세요.
            </p>

            {/* 업로드 박스 */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragActive
                  ? 'border-slate-900 bg-slate-100'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="text-sm text-slate-600">
                파일을 여기에 놓거나 클릭해서 선택
              </div>

              {/* 숨겨진 파일 입력창 */}
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0])}
              />
            </div>

            {/* 선택된 파일명 표시 */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {file ? (
                <>
                  <div className="font-medium text-slate-900">선택된 파일</div>
                  <div className="mt-1 break-all">{file.name}</div>
                </>
              ) : (
                '선택된 파일이 없습니다.'
              )}
            </div>

            {/* 작업 ID 표시 */}
            <div className="mt-4 text-sm text-slate-500">
              작업 ID: {jobId || '-'}
            </div>

            {/* 진행률 표시 */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>진행률</span>
                <span>{progress}%</span>
              </div>

              {/* 진행률 바 */}
              <div className="h-3 w-full rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-slate-900 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 에러 메시지가 있을 때만 표시 */}
            {errorMessage && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="mt-6 flex flex-col gap-3">
              {/* 전사 + 요약 시작 버튼 */}
              <button
                onClick={handleUpload}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? '처리 중...' : '전사 + 요약하기'}
              </button>

              {/* txt 다운로드 버튼 */}
              <button
                onClick={handleDownloadTxt}
                disabled={!transcription && !summary}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                txt 다운로드
              </button>
            </div>
          </div>

          {/* 오른쪽 영역 */}
          <div className="lg:col-span-2 grid gap-6">
            {/* 전사 결과 카드 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">전사 결과</h2>

                <button
                  onClick={() => handleCopy(transcription, '전사 결과')}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  복사
                </button>
              </div>

              <div className="min-h-[220px] rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {/* pre: 줄바꿈/공백 유지 */}
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {transcription || '전사 결과가 여기에 표시됩니다.'}
                </pre>
              </div>
            </div>

            {/* 요약 결과 카드 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">요약 결과</h2>

                <button
                  onClick={() => handleCopy(summary, '요약 결과')}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  복사
                </button>
              </div>

              <div className="min-h-[220px] rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
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

// 다른 파일에서 import 해서 쓸 수 있도록 export 합니다.
export default App