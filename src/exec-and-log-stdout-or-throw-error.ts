import exec from "@simplyhexagonal/exec";

/**
 * Executes a command and logs stdout
 * @throws {@link Error} if the exit code is not 0
 */
export async function execAndLogStdoutOrThrowError(param: { command: string }) {
  const { command } = param;
   const { execPromise, execProcess } = exec(command);
   const execResult = await execPromise;
   if (execResult.exitCode !== 0) {
     throw new Error(execResult.stderrOutput);
   }
   console.log(execResult.stdoutOutput);
   return { execResult };
 }