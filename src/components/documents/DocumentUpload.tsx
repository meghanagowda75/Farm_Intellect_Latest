
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  File,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Clock,
  Shield,
} from "lucide-react";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  type: string;
  originalName: string;
  size: number;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (document: Document) => void;
}

export const DocumentUpload = ({
  onUploadComplete,
}: DocumentUploadProps) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await apiFetch<{ documents: Document[] }>(
        "/api/documents/my-documents"
      );
      setDocuments(response.documents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load documents"
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const documentTypes = [
    { value: "ID_PROOF", label: "ID Proof (Aadhar/PAN/Passport)" },
    { value: "ADDRESS_PROOF", label: "Address Proof" },
    { value: "LAND_RECORDS", label: "Land Records" },
    { value: "BUSINESS_LICENSE", label: "Business License" },
    { value: "OTHER", label: "Other Documents" },
  ];

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ];

      if (!allowedTypes.includes(file.type)) {
        setError("Only JPEG, PNG, and PDF files are allowed");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
      setError("");
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentType) {
      setError("Please select a file and document type");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");

    const interval = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          window.clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("type", documentType);

      const response = await apiFetch<{ document: Document }>(
        "/api/documents/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const newDocument = response.document;
      setDocuments((prev) => [newDocument, ...prev]);

      onUploadComplete?.(newDocument);

      setUploadProgress(100);
      setSelectedFile(null);
      setDocumentType("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Document uploaded",
        description: "Your document was uploaded successfully.",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );
    } finally {
      window.clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadDocument = async (
    id: string,
    originalName: string
  ) => {
    setError("");

    try {
      let blob: Blob;

      // Use the local mock document storage.
      const dataUrl = await apiFetch<string>(
        `/api/documents/download/${encodeURIComponent(id)}`
      );

      if (!dataUrl || !dataUrl.startsWith("data:")) {
        throw new Error(
          `"${originalName}" has no saved file. Please upload it again.`
        );
      }

      // Convert the Base64 data URL directly to a Blob.
      // Do not use fetch(dataUrl), because the app's CSP blocks it.
      const parts = dataUrl.split(",");
      if (parts.length !== 2) {
        throw new Error("The saved document data is invalid.");
      }

      const mimeType =
        dataUrl.match(/^data:(.*?);base64,/)?.[1] ||
        "application/octet-stream";

      const binary = atob(parts[1]);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      blob = new Blob([bytes], { type: mimeType });

      if (!blob.size) {
        throw new Error("The downloaded document is empty.");
      }

      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");

      anchor.href = url;
      anchor.download = originalName;
      anchor.style.display = "none";
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Download failed.";

      setError(message);
      console.error("Document download failed:", err);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await apiFetch(`/api/documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setDocuments((current) =>
        current.filter((document) => document.id !== id)
      );

      toast({
        title: "Document deleted",
        description: "The document was removed successfully.",
      });
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
      " " +
      sizes[i]
    );
  };

  const getStatusBadge = (document: Document) => {
    if (document.isVerified) {
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Document Upload & Verification
          </CardTitle>
          <CardDescription>
            Upload your documents for verification. Accepted formats:
            JPEG, PNG, PDF (max 10MB)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={setDocumentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.pdf"
              disabled={isUploading}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <File className="h-8 w-8 text-muted-foreground" />

              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <Button
            onClick={uploadDocument}
            disabled={!selectedFile || !documentType || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            View and manage your uploaded documents
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loadingDocuments ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading your documents...
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-muted-foreground" />

                    <div>
                      <p className="font-medium">
                        {document.originalName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {
                          documentTypes.find(
                            (t) => t.value === document.type
                          )?.label
                        }{" "}
                        • {formatFileSize(document.size)} •{" "}
                        {new Date(
                          document.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(document)}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        downloadDocument(
                          document.id,
                          document.originalName
                        )
                      }
                      aria-label={`Download ${document.originalName}`}
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(document.id)}
                      aria-label={`Delete ${document.originalName}`}
                      title="Delete document"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No documents uploaded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};