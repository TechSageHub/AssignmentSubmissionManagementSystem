import { useState, useEffect } from 'react'
import { FileText, AlertCircle, Loader2, Maximize2, Minimize2, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/services/api'

interface FilePreviewProps {
  submissionId?: number
  fileName?: string
  localFile?: File
  fileId?: number
}

export default function FilePreview({ submissionId, fileName, localFile, fileId }: FilePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!submissionId)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'text' | 'other'>('other')

  const displayName = localFile?.name || fileName || 'file'

  useEffect(() => {
    if (localFile) {
      const url = URL.createObjectURL(localFile)
      setBlobUrl(url)
      setLoading(false)
      detectType(localFile.name, localFile.type)
      return () => URL.revokeObjectURL(url)
    }

    if (submissionId) {
      let url: string | null = null
      let isMounted = true

      const fetchFile = async () => {
        try {
          const res = await api.get(`/submissions/${submissionId}/file${fileId ? `?fileId=${fileId}` : ''}`, {
            responseType: 'blob',
          })

          if (!isMounted) return

          // If backend returns a JSON error blob (e.g. 404), inspect it
          if (res.data.type === 'application/json') {
            try {
              const text = await res.data.text()
              const json = JSON.parse(text)
              if (json.error || json.details) {
                setError(json.details || json.error || 'File not found on server')
                return
              }
            } catch { /* proceed as normal blob */ }
          }

          url = URL.createObjectURL(res.data)
          setBlobUrl(url)
          detectType(fileName || 'file', res.data.type)
        } catch (err: any) {
          if (!isMounted) return
          const msg = err.response?.data?.details || err.response?.data?.error || 'Failed to load file preview'
          setError(msg)
        } finally {
          if (isMounted) setLoading(false)
        }
      }

      fetchFile()
      return () => {
        isMounted = false
        if (url) URL.revokeObjectURL(url)
      }
    }
  }, [submissionId, localFile, fileId, fileName])

  function detectType(name: string, mime: string) {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
    const pdfTypes = ['pdf']
    const textTypes = [
      'txt', 'csv', 'html', 'htm', 'json', 'xml', 'md', 'log', 'css', 'js', 'ts', 'tsx', 'jsx',
      'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'sh', 'sql', 'rb', 'go', 'rs', 'yaml', 'yml', 'env'
    ]
    const ext = (name || '').split('.').pop()?.toLowerCase() || ''
    if (imageTypes.includes(ext) || (mime && mime.startsWith('image/'))) setFileType('image')
    else if (pdfTypes.includes(ext) || mime === 'application/pdf') setFileType('pdf')
    else if (textTypes.includes(ext) || (mime && (mime.startsWith('text/') || mime === 'application/json'))) setFileType('text')
    else setFileType('other')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border bg-muted/10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-lg border bg-muted/10 text-muted-foreground gap-2 p-4 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm font-medium">{error}</p>
        <p className="text-xs text-muted-foreground">The file may have been removed or is unavailable.</p>
      </div>
    )
  }

  if (fileType === 'other') {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-lg border bg-muted/10 text-muted-foreground gap-3 p-4">
        <FileText className="h-8 w-8 text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium truncate max-w-full px-4">{displayName}</p>
          <p className="text-xs text-muted-foreground">Binary or document format</p>
        </div>
        {blobUrl && (
          <a
            href={blobUrl}
            download={displayName}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md"
          >
            <Download className="h-3.5 w-3.5" />
            Download File
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-2">
          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1">
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      <div className={`rounded-lg border ${expanded ? 'h-[80vh] overflow-auto' : 'max-h-[50vh] sm:max-h-[500px] overflow-hidden'} flex items-start justify-center bg-muted/5 p-2`}>
        {fileType === 'image' && blobUrl && (
          <img src={blobUrl} alt={displayName} className="max-w-full max-h-full object-contain rounded" />
        )}
        {fileType === 'pdf' && blobUrl && (
          <object data={blobUrl} type="application/pdf" className={`w-full ${expanded ? 'h-[80vh]' : 'h-[50vh] min-h-[300px] sm:min-h-[400px]'} rounded`}>
            <iframe src={blobUrl} title={displayName} className={`w-full ${expanded ? 'h-[80vh]' : 'h-[50vh] min-h-[300px]'} rounded`}>
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
                <FileText className="h-8 w-8" />
                <p className="text-sm text-center">PDF preview not inlineable on this browser.</p>
                <a href={blobUrl} download={displayName} className="text-sm text-primary underline">
                  Download PDF
                </a>
              </div>
            </iframe>
          </object>
        )}
        {fileType === 'text' && blobUrl && (
          <TextPreview url={blobUrl} expanded={expanded} />
        )}
      </div>
    </div>
  )
}

function TextPreview({ url, expanded }: { url: string; expanded?: boolean }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(t => {
        setContent(t)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading text content...</span>
      </div>
    )
  }

  return (
    <pre className={`w-full p-4 text-xs font-mono overflow-auto ${expanded ? '' : 'max-h-[480px]'} whitespace-pre-wrap break-words bg-background/50 rounded`}>
      {content || '(Empty file)'}
    </pre>
  )
}