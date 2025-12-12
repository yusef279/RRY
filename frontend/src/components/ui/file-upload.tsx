"use client";

import * as React from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  onChange?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  value?: File[];
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onChange,
  onRemove,
  accept = "*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxFiles = 5,
  value = [],
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFiles = (files: File[]): { valid: File[]; error?: string } => {
    const valid: File[] = [];

    if (value.length + files.length > maxFiles) {
      return {
        valid: [],
        error: `Maximum ${maxFiles} files allowed`,
      };
    }

    for (const file of files) {
      if (file.size > maxSize) {
        return {
          valid: [],
          error: `File ${file.name} exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`,
        };
      }
      valid.push(file);
    }

    return { valid };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const { valid, error } = validateFiles(files);

    if (error) {
      setError(error);
      setTimeout(() => setError(""), 3000);
      return;
    }

    onChange?.([...value, ...valid]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const { valid, error } = validateFiles(files);

    if (error) {
      setError(error);
      setTimeout(() => setError(""), 3000);
      return;
    }

    onChange?.([...value, ...valid]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    onRemove?.(index);
    const newFiles = value.filter((_, i) => i !== index);
    onChange?.(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging && !disabled
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-primary/50"
        )}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
        />

        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm font-medium mb-1">
          {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxFiles} files, up to {(maxSize / 1024 / 1024).toFixed(0)}MB each
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
