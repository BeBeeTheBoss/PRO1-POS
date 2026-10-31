import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Props = { module: string; title: string; description: string };

export default function ModuleOverview({ title, description }: Props) {
    return (
        <>
            <Head title={title} />
            <div className="flex flex-1 items-center justify-center p-6">
                <Card className="w-full max-w-xl">
                    <CardContent className="flex flex-col items-center p-10 text-center">
                        <div className="mb-5 rounded-2xl bg-amber-100 p-4 text-amber-700 dark:bg-amber-950">
                            <Construction className="size-9" />
                        </div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="mt-2 max-w-md text-muted-foreground">
                            {description}
                        </p>
                        <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm">
                            The data model and navigation are ready. Feature
                            implementation is tracked in{' '}
                            <code>docs/ROADMAP.md</code>.
                        </p>
                        <Button asChild variant="outline" className="mt-6">
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 size-4" />
                                Back to dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ModuleOverview.layout = { breadcrumbs: [{ title: 'Module', href: '#' }] };
