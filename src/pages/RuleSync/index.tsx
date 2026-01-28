import { memo, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';

const DEMO_CODE = `{
  "name": "example",
  "version": "1.0.0"
}`;

const RuleSync = memo(() => {
  const [code, setCode] = useState(DEMO_CODE);

  return (
    <div className="h-full">
      <CodeEditor
        height="400px"
        language="json"
        value={code}
        onChange={(value: string | undefined) => setCode(value ?? '')}
      />
    </div>
  );
});

export default RuleSync;
