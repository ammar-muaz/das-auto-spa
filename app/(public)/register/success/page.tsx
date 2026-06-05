import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Das Auto Spa" className="h-10 w-10 object-contain rounded-xl" />
            <h1 className="text-gray-900 text-xl font-bold">Das Auto Spa</h1>
          </div>

          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Account Created Successfully!</h2>
            <p className="text-gray-600">Please log in with your credentials to continue.</p>
          </div>

          <Link
            href="/login"
            className="block w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors text-center font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
