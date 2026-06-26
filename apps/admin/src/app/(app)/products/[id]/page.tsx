import ProductForm from '@/components/ProductForm';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-black">Edit Product</h1>
      <ProductForm productId={id} />
    </div>
  );
}
