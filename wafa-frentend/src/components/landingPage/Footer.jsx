import React from 'react'

const Footer = () => {
  return (
     <footer className="bg-card text-card-foreground py-12 px-6 border-t border-border">
     <div className="max-w-7xl mx-auto">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
         <div>
           <div className="text-3xl font-bold mb-4">
             <span className="text-blue-600 dark:text-blue-400">WA</span>
             <span className="text-teal-600 dark:text-teal-400">FA</span>
           </div>
           <p className="text-muted-foreground mb-4">Excellence en formation médicale</p>
           <div className="flex space-x-4">
             <a href="#" className="text-muted-foreground hover:text-blue-500 transition-colors">📘</a>
             <a href="#" className="text-muted-foreground hover:text-blue-500 transition-colors">🐦</a>
             <a href="#" className="text-muted-foreground hover:text-blue-500 transition-colors">📧</a>
           </div>
         </div>
         
         <div>
           <h4 className="text-foreground font-bold mb-4">Plateforme</h4>
           <ul className="space-y-2 text-muted-foreground">
             <li><a href="#" className="hover:text-blue-500 transition-colors">QCM Médicaux</a></li>
             <li><a href="#" className="hover:text-blue-500 transition-colors">Tarifs</a></li>
             <li><a href="#" className="hover:text-blue-500 transition-colors">Spécialités</a></li>
           </ul>
         </div>
         
         <div>
           <h4 className="text-foreground font-bold mb-4">Support</h4>
           <ul className="space-y-2 text-muted-foreground">
             <li><a href="#faq" className="hover:text-blue-500 transition-colors">FAQ</a></li>
             <li><a href="#contact" className="hover:text-blue-500 transition-colors">Contact</a></li>
             <li><a href="#" className="hover:text-blue-500 transition-colors">Centre d'aide</a></li>
           </ul>
         </div>
         
         <div>
           <h4 className="text-foreground font-bold mb-4">Légal</h4>
           <ul className="space-y-2 text-muted-foreground">
             <li><a href="#" className="hover:text-blue-500 transition-colors">Confidentialité</a></li>
             <li><a href="#" className="hover:text-blue-500 transition-colors">Conditions</a></li>
             <li><a href="#" className="hover:text-blue-500 transition-colors">Cookies</a></li>
           </ul>
         </div>
       </div>
       
       <div className="border-t border-border pt-8 text-center text-muted-foreground">
         <p>&copy; {new Date().getFullYear()} WAFA. Tous droits réservés.</p>
       </div>
     </div>
   </footer>
  )
}

export default Footer