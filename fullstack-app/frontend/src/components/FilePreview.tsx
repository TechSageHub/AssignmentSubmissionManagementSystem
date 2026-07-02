import { useState, useEffect } from 'react'
import { FileText, AlertCircle, Loader2, Maximize2, Minimize2 } from 'lucide-react'
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
      const fetchFile = async () => {
        try {
          const res = await api.get(`/submissions/${submissionId}/file${fileId ? `?fileId=${fileId}` : ''}`, {
            responseType: 'blob',
          })
          url = URL.createObjectURL(res.data)
          setBlobUrl(url)
          detectType(fileName || 'file', res.data.type)
        } catch {
          setError('Failed to load file preview')
        } finally {
          setLoading(false)
        }
      }
      fetchFile()
      return () => {
        if (url) URL.revokeObjectURL(url)
      }
    }
  }, [submissionId, localFile, fileId])

  function detectType(name: string, mime: string) {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    const pdfTypes = ['pdf']
    const textTypes = ['txt', 'csv', 'html', 'htm', 'json', 'xml', 'md', 'log', 'css', 'js', 'ts', 'tsx', 'jsx']
    const e = name.split('.').pop()?.toLowerCase() || ''
    if (imageTypes.includes(e) || mime.startsWith('image/')) setFileType('image')
    else if (pdfTypes.includes(e) || mime === 'application/pdf') setFileType('pdf')
    else if (textTypes.includes(e) || mime.startsWith('text/')) setFileType('text')
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
      <div className="flex flex-col items-center justify-center h-48 rounded-lg border bg-muted/10 text-muted-foreground gap-2">
        <AlertCircle className="h-6 w-6" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (fileType === 'other') {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-lg border bg-muted/10 text-muted-foreground gap-2">
        <FileText className="h-8 w-8" />
        <p className="text-sm font-medium truncate max-w-full px-4">{displayName}</p>
        <p className="text-xs">Preview not available for this file type</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1">
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      <div className={`rounded-lg border ${expanded ? 'h-[80vh] overflow-auto' : 'max-h-[50vh] sm:max-h-[500px] overflow-hidden'} flex items-start justify-center bg-muted/5`}>
        {fileType === 'image' && blobUrl && (
          <img src={blobUrl} alt={displayName} className="max-w-full max-h-full object-contain" />
        )}
        {fileType === 'pdf' && blobUrl && (
          <object data={blobUrl} type="application/pdf" className={`w-full ${expanded ? 'h-[80vh]' : 'h-[50vh] min-h-[300px] sm:min-h-[400px]'} rounded`}>
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
              <FileText className="h-8 w-8" />
              <p className="text-sm text-center">PDF preview not available on this device.</p>
              <a href={blobUrl} download={displayName} className="text-sm text-primary underline">
                Download to view
              </a>
            </div>
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
  useEffect(() => {
    fetch(url).then(r => r.text()).then(setContent).catch(() => {})
  }, [url])
  return (
    <pre className={`w-full p-4 text-xs overflow-auto ${expanded ? '' : 'max-h-[480px]'} whitespace-pre-wrap break-words`}>
      {content || 'Loading...'}
    </pre>
  )
}