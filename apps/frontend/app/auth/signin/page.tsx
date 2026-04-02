import { AuthPage } from "../../../components/AuthPage";
import { getUser } from "@/app/lib/getUser";
import {redirect} from "next/navigation"

 export default async function Page(){
    
    const user = await getUser()
    
    if(user != null) {
        redirect('/dashboard')
    }

    return(
        <div>
            <AuthPage isSignIn = {true}/>
        </div>
    )


}
