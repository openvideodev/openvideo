"use client";
import { useParams, useRouter } from "next/navigation";
import Editor from "@/components/editor/editor";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return <Editor />;
}
