import Footer from "./Footer"
import Header from "./Header"

export default function Layout({ children }: any) {

  //return (<></>)
  
  return (
    <>
      <Header/>
      { children }
      <Footer/>
    </>
  )
  
  
}

