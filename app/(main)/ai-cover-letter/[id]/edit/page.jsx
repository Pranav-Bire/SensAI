import { getCoverLetter } from "@/actions/cover-letter";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoverLetterGenerator from "../../_components/cover-letter-generator";
import { notFound, redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";

export default async function EditCoverLetterPage({ params }) {
  const user = await checkUser();

  if (!user) {
    redirect("/sign-in");
  }

  try {
    const coverLetter = await getCoverLetter(params.id);

    if (!coverLetter) {
      notFound();
    }

    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-2">
          <Link href="/ai-cover-letter">
            <Button variant="link" className="gap-2 pl-0">
              <ArrowLeft className="h-4 w-4" />
              Back to Cover Letters
            </Button>
          </Link>

          <div className="pb-6">
            <h1 className="text-6xl font-bold gradient-title">
              Edit Cover Letter
            </h1>
            <p className="text-muted-foreground">
              Update your cover letter for {coverLetter.companyName}
            </p>
          </div>
        </div>

        <CoverLetterGenerator initialData={coverLetter} />
      </div>
    );
  } catch (error) {
    console.error("Error loading cover letter:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-semibold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">Failed to load cover letter. Please try again later.</p>
        <Link href="/ai-cover-letter">
          <Button variant="outline">Back to Cover Letters</Button>
        </Link>
      </div>
    );
  }
}
