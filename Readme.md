<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::prefix('v1')->group(function () {
    Route::get('users', 'App\Http\Controllers\UserController@index');
    Route::post('users', 'App\Http\Controllers\UserController@store');
    Route::get('users/{id}', 'App\Http\Controllers\UserController@show');
    Route::put('users/{id}', 'App\Http\Controllers\UserController@update');
    Route::delete('users/{id}', 'App\Http\Controllers\UserController@destroy');
});

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_details', function (Blueprint $table) {
            $table->id(); 
            $table->string('name'); 
            $table->string('address'); 
            $table->string('phone_number'); 
            $table->integer('age'); 
            $table->enum('role', ['admin', 'developer', 'sales']); 
            $table->string('description')->nullable();
            $table->timestamps();
        });
        
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_details');
    }
};


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserDetails extends Model
{
    protected $table = 'user_details';
    protected $fillable = ['name', 'address', 'phone_number', 'age', 'role', 'description'];
    public $timestamps = false;
}


<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserDetails; // Correct Model Name

class UserController extends Controller
{
    public function index()
    {
        $userDetails = UserDetails::all(); // Correct Usage
        return response()->json(['message' => 'GET method', 'user_details' => $userDetails]);
    }

    public function store(Request $request)
    {
        // dd($request->all());
        $userDetails = UserDetails::create($request->all()); 
        return response()->json(['message' => 'POST method', 'user_details' => $userDetails]);
    }

    public function show($id)
    {
        $userDetails = UserDetails::find($id); // Correct Usage
        return response()->json(['message' => 'GET method with id ' . $id, 'user_details' => $userDetails]);
    }

    public function update(Request $request, $id)
    {
        UserDetails::find($id)->update($request->all()); // Correct Usage
        return response()->json(['message' => 'PUT method with id ' . $id, 'user_details' => UserDetails::find($id)]);
    }

    public function destroy($id)
    {
        return response()->json(['message' => 'DELETE method with id ' . $id, 'user_details' => UserDetails::find($id)->delete()]);
    }
}
