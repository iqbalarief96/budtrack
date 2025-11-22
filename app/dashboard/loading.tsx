export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="relative">
          <div className="h-12 w-12 mx-auto">
            <div className="absolute h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            <div className="absolute h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Loading dashboard...
        </p>
      </div>
    </div>
  )
}
