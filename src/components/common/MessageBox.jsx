export default function MessageBox({ message }) {
    if (!message.text) return null

    const isError = message.type === 'error'

    return (
        <div className={`mb-6 p-4 rounded-lg border-2 ${isError
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
            <p className={`font-bold ${isError ? 'text-red-800' : 'text-green-800'}`}>
                {isError ? '⚠️ Error' : '✅ Success'}
            </p>
            <p className={`text-sm ${isError ? 'text-red-700' : 'text-green-700'}`}>
                {message.text}
            </p>
        </div>
    )
}
