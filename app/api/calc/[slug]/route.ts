import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — returns just enough for the calculator page to brand itself.
// The catalog is NOT returned here; it's only read server-side on submit.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const link = await prisma.calculatorLink.findUnique({
    where: { slug: params.slug },
    include: {
      installer: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          logoUrl: true,
          region: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!link || !link.isActive || !link.installer) {
    return NextResponse.json({ error: 'Calculator not found' }, { status: 404 });
  }

  return NextResponse.json({
    installer: link.installer,
  });
}
