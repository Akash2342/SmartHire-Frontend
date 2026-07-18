import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResume, uploadResume, downloadResume, deleteResume } from '@/api/candidate'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { FileText, Upload, Download, Trash2, AlertCircle } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert raw bytes to a human-readable string e.g. 204800 → "200 KB" */
function formatFileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Format an ISO timestamp to a readable date e.g. "16 Jul 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// ─── ResumePage ───────────────────────────────────────────────────────────────

/**
 * Seeker resume management page — route: /seeker/resume
 *
 * Three UI states:
 *   1. isLoading  — fetching whether a resume exists
 *   2. data exists — show resume metadata with download / delete actions
 *   3. no resume  — show the upload form
 *
 * After every mutation (upload or delete) we call queryClient.invalidateQueries()
 * which tells TanStack Query the cached resume data is stale and triggers a fresh
 * fetch, keeping the UI in sync with the backend automatically.
 */
export function ResumePage() {
  // queryClient lets us manually interact with the cache (e.g. invalidate after mutations)
  const queryClient = useQueryClient()

  // Local state: the file the user picked, and any client-side validation error
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [validationError, setValidationError] = useState('')

  // useRef gives us a direct handle to the hidden <input type="file"> DOM element
  // so we can programmatically trigger the file picker via a styled button
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch resume metadata ─────────────────────────────────────────────────
  // queryKey: ['myResume'] — this name is used by invalidateQueries after mutations
  // The backend returns 404 if no resume exists; TanStack Query sets isError=true.
  // We treat a 404 as "no resume yet" (handled below), not as a real error.
  const {
    data: resume,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['myResume'],
    queryFn:  getResume,
    // Don't retry on 404 — it just means no resume uploaded yet, not a server problem
    retry: (_, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      return status !== 404
    },
  })

  // ── Upload mutation ───────────────────────────────────────────────────────
  // mutationFn receives the File object and calls the API
  // onSuccess: clears the selected file and refreshes the resume query
  // onError: shows the server error message if the upload failed
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadResume(file),
    onSuccess: () => {
      setSelectedFile(null)
      // Invalidate the cached resume so the UI re-fetches and shows the new file
      queryClient.invalidateQueries({ queryKey: ['myResume'] })
    },
  })

  // ── Delete mutation ────────────────────────────────────────────────────────
  // After deletion the resume query will return 404, so the UI switches back
  // to the upload form automatically
  const deleteMutation = useMutation({
    mutationFn: deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myResume'] })
    },
  })

  // ── Download handler ──────────────────────────────────────────────────────
  // downloadResume() in api/candidate.ts fetches the file as a blob and
  // programmatically triggers the browser's save dialog
  const [isDownloading, setIsDownloading] = useState(false)
  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadResume()
    } finally {
      setIsDownloading(false)
    }
  }

  // ── File picker handlers ──────────────────────────────────────────────────

  // Validate the file before storing it in state — we check client-side first
  // so the user gets instant feedback without waiting for an API round-trip
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError('')
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setValidationError('Only PDF or DOCX files are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError('File must be under 5 MB.')
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (selectedFile) uploadMutation.mutate(selectedFile)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // isLoading: the initial fetch is in progress
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-gray-500">
        Loading...
      </div>
    )
  }

  // Determine if it's a real error vs just "no resume yet" (404)
  const status = (error as { response?: { status?: number } })?.response?.status
  const isRealError = isError && status !== 404

  if (isRealError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-red-600">
        Failed to load resume. Please try again.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Resume</h1>

      {/* ── State A: resume exists → show metadata + actions ────────────── */}
      {resume ? (
        <Card>
          <CardBody>
            {/* File info row */}
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                {/* truncate prevents long filenames from breaking the layout */}
                <p className="truncate font-semibold text-gray-900">
                  {resume.originalFileName}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatFileSize(resume.fileSizeBytes)} · Uploaded {formatDate(resume.uploadedAt)}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-5">
              <Button
                variant="outline"
                size="sm"
                loading={isDownloading}
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download
              </Button>

              <Button
                variant="danger"
                size="sm"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>

            {/* Show error from delete mutation if it failed */}
            {deleteMutation.isError && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Failed to delete. Please try again.
              </p>
            )}
          </CardBody>
        </Card>
      ) : (
        /* ── State B: no resume → show upload form ─────────────────────── */
        <Card>
          <CardBody className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Upload your resume so recruiters can review it when you apply.
              Accepted formats: <strong>PDF</strong> or <strong>DOCX</strong>, max <strong>5 MB</strong>.
            </p>

            {/*
              Hidden native file input — styled buttons look better than the
              browser's default file picker button, so we hide the input and
              trigger it via fileInputRef.current.click() on the button below.
            */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Clicking this button programmatically opens the file picker */}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {selectedFile ? selectedFile.name : 'Choose File'}
            </Button>

            {/* Client-side validation error */}
            {validationError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {validationError}
              </p>
            )}

            {/* Server-side error from the upload mutation */}
            {uploadMutation.isError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Upload failed. Please try again.
              </p>
            )}

            {/* Upload button — only shown once a valid file is selected */}
            {selectedFile && !validationError && (
              <Button
                onClick={handleUpload}
                loading={uploadMutation.isPending}
              >
                Upload Resume
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
