import AppleHealthSetup from '../../components/AppleHealthSetup'

export default function ConnectionsSettings() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Sync weight and steps from Apple Health via an iPhone automation (not live during the day).
      </p>
      <ul className="space-y-2">
        <AppleHealthSetup />
        <li className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <p className="font-medium text-stone-900 dark:text-stone-50">Health Connect</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Android sync — not available yet
          </p>
        </li>
      </ul>
    </div>
  )
}
