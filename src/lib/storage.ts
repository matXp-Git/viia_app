export const REPORT_PHOTOS_BUCKET = "report-photos";

export function reportPhotoUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${REPORT_PHOTOS_BUCKET}/${storagePath}`;
}
